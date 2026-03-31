import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import helcimService from './helcimService';
import { sendInvoiceGenerated, sendPaymentReceived, sendPaymentFailed } from './emailService';
import { config } from '../config/environment';
import logger from '../utils/logger';

const PORTAL_URL = config.email.appUrl.replace('app.', 'portal.');

function advanceDate(date: Date, frequency: string): Date | null {
  const next = new Date(date);
  if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  // one_time — don't bill again
  return null;
}

class BillingService {
  async generateDueInvoices(organizationId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'active',
        nextBillingDate: { lte: today },
        contact: organizationId ? { organizationId } : undefined,
      },
      include: {
        contact: { include: { family: true, organization: true } },
        program: true,
      },
    });

    if (!enrollments.length) {
      logger.info('Billing run: no due enrollments');
      return { invoicesCreated: 0, autoCharged: 0, errors: 0 };
    }

    let invoicesCreated = 0;
    let autoCharged = 0;
    let errors = 0;

    for (const enrollment of enrollments) {
      try {
        const orgId = enrollment.contact.organizationId;
        const dueDate = enrollment.nextBillingDate ?? today;

        // Check if max billing cycles reached
        if (enrollment.program.maxBillingCycles !== null && enrollment.program.maxBillingCycles !== undefined) {
          const cyclesCompleted = await prisma.invoiceLineItem.count({
            where: { enrollmentId: enrollment.id },
          });
          if (cyclesCompleted >= enrollment.program.maxBillingCycles) {
            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: { status: 'cancelled', endDate: today, nextBillingDate: null },
            });
            logger.info(`Billing: enrollment ${enrollment.id} reached max cycles (${enrollment.program.maxBillingCycles}) — auto-cancelled`);
            continue;
          }
        }

        // Generate invoice number
        const count = await prisma.invoice.count({ where: { organizationId: orgId } });
        const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;
        const amount = Number(enrollment.program.price);

        const invoice = await prisma.invoice.create({
          data: {
            organizationId: orgId,
            contactId: enrollment.contactId,
            invoiceNumber,
            amountDue: new Decimal(amount),
            dueDate,
            status: 'sent',
            notes: `Auto-generated — ${enrollment.program.name}`,
            lineItems: {
              create: [{
                enrollmentId: enrollment.id,
                description: enrollment.program.name,
                quantity: 1,
                unitPrice: new Decimal(amount),
                total: new Decimal(amount),
              }],
            },
          },
        });

        invoicesCreated++;
        logger.info(`Billing: created ${invoiceNumber} for enrollment ${enrollment.id}`);

        // Email contact — invoice generated (fire-and-forget)
        const contactEmail = enrollment.contact.email;
        const contactName = `${enrollment.contact.firstName} ${enrollment.contact.lastName}`.trim();
        if (contactEmail) {
          sendInvoiceGenerated(contactEmail, {
            recipientName: contactName,
            orgName: enrollment.contact.organization?.name ?? 'your organization',
            invoiceNumber,
            amount,
            currency: 'USD',
            dueDate,
            programName: enrollment.program.name,
            portalUrl: `${PORTAL_URL}/invoices/${invoice.id}`,
          }).catch((err) => logger.error('Failed to send invoice email', { err }));
        }

        // Attempt auto-charge — prefer contact token, fall back to family token
        const cardToken = enrollment.contact.helcimToken ?? enrollment.contact.family?.helcimToken ?? null;
        if (cardToken) {
          try {
            const helcimTx = await helcimService.processPayment({
              amount,
              currency: 'USD',
              cardToken,
              customerId: cardToken,
            });

            await prisma.payment.create({
              data: {
                organizationId: orgId,
                invoiceId: invoice.id,
                helcimTransactionId: helcimTx.transactionId,
                amount: new Decimal(amount),
                currency: 'USD',
                status: helcimTx.status || 'succeeded',
                paymentMethodType: 'card',
                cardToken,
                notes: 'Auto-charged via recurring billing',
              },
            });

            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'paid', amountPaid: new Decimal(amount), paidAt: new Date() },
            });

            autoCharged++;
            logger.info(`Billing: auto-charged invoice ${invoiceNumber}`);

            // Email contact — payment received
            if (contactEmail) {
              sendPaymentReceived(contactEmail, {
                recipientName: contactName,
                orgName: enrollment.contact.organization?.name ?? 'your organization',
                invoiceNumber,
                amount,
                currency: 'USD',
              }).catch((err) => logger.error('Failed to send payment received email', { err }));
            }
          } catch (chargeErr) {
            logger.warn(`Billing: auto-charge failed for ${invoiceNumber} — ${(chargeErr as Error).message}`);

            // Email contact — payment failed
            if (contactEmail) {
              sendPaymentFailed(contactEmail, {
                recipientName: contactName,
                orgName: enrollment.contact.organization?.name ?? 'your organization',
                invoiceNumber,
                amount,
                currency: 'USD',
                portalUrl: `${PORTAL_URL}/invoices/${invoice.id}`,
              }).catch((err) => logger.error('Failed to send payment failed email', { err }));
            }
          }
        }

        // Advance or clear nextBillingDate
        const nextDate = advanceDate(dueDate, enrollment.program.billingFrequency);
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { nextBillingDate: nextDate },
        });
      } catch (err) {
        errors++;
        logger.error(`Billing: error processing enrollment ${enrollment.id} — ${(err as Error).message}`);
      }
    }

    // Also mark overdue invoices while we're here
    await prisma.invoice.updateMany({
      where: {
        status: { in: ['draft', 'sent'] },
        dueDate: { lt: today },
        ...(organizationId ? { organizationId } : {}),
      },
      data: { status: 'overdue' },
    });

    logger.info(`Billing run complete: ${invoicesCreated} created, ${autoCharged} auto-charged, ${errors} errors`);
    return { invoicesCreated, autoCharged, errors };
  }
}

export default new BillingService();
