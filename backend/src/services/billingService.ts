import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import helcimService from './helcimService';
import logger from '../utils/logger';

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
        contact: true,
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

        // Attempt auto-charge if helcimToken is available
        if (enrollment.contact.helcimToken) {
          try {
            const helcimTx = await helcimService.processPayment({
              amount,
              currency: 'USD',
              cardToken: enrollment.contact.helcimToken,
              customerId: enrollment.contact.helcimToken,
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
                cardToken: enrollment.contact.helcimToken,
                notes: 'Auto-charged via recurring billing',
              },
            });

            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'paid', amountPaid: new Decimal(amount), paidAt: new Date() },
            });

            autoCharged++;
            logger.info(`Billing: auto-charged invoice ${invoiceNumber}`);
          } catch (chargeErr) {
            logger.warn(`Billing: auto-charge failed for ${invoiceNumber} — ${(chargeErr as Error).message}`);
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
