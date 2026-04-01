import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import stripeConnectService from './stripeConnectService';
import { sendInvoiceGenerated, sendPaymentReceived, sendPaymentFailed } from './emailService';
import { config } from '../config/environment';
import logger from '../utils/logger';

const PORTAL_URL = config.email.appUrl.replace('app.', 'portal.');

function advanceDate(date: Date, frequency: string): Date | null {
  const next = new Date(date);
  if (frequency === 'monthly') {
    next.setUTCMonth(next.getUTCMonth() + 1);
    return next;
  }
  if (frequency === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  if (frequency === 'yearly') {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    return next;
  }
  // one_time — don't bill again
  return null;
}

// Shape returned by the enrollment query
type EnrollmentWithRelations = Awaited<
  ReturnType<typeof prisma.enrollment.findMany>
>[number] & {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    organizationId: string;
    stripeCustomerId: string | null;
    stripeDefaultPaymentMethodId: string | null;
    familyId: string | null;
    family: {
      id: string;
      name: string;
      stripeCustomerId: string | null;
      stripeDefaultPaymentMethodId: string | null;
      billingEmail: string | null;
    } | null;
    organization: {
      slug: string;
      name: string;
      stripeConnectAccountId: string | null;
      stripeConnectOnboardingComplete: boolean;
    } | null;
  };
  program: {
    id: string;
    name: string;
    price: Decimal;
    billingFrequency: string;
    maxBillingCycles: number | null;
  };
};

/** Returns the next globally-unique invoice number (INV-XXXXX).
 *  Finds the current highest numeric suffix across ALL orgs and increments it.
 *  invoiceNumber has a @unique constraint, so this must be global. */
async function nextInvoiceNumber(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  const n = last ? parseInt(last.invoiceNumber.replace(/\D/g, ''), 10) : 0;
  return `INV-${String((isNaN(n) ? 0 : n) + 1).padStart(5, '0')}`;
}

class BillingService {
  async generateDueInvoices(organizationId?: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    logger.info(`Billing run started — today=${today.toISOString()}, org=${organizationId ?? 'ALL'}`);

    const totalActive = await prisma.enrollment.count({
      where: {
        status: 'active',
        contact: organizationId ? { organizationId } : undefined,
      },
    });
    logger.info(`Billing: ${totalActive} active enrollment(s) for org scope`);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'active',
        nextBillingDate: { lte: today },
        contact: organizationId ? { organizationId } : undefined,
      },
      include: {
        contact: {
          include: {
            family: {
              select: {
                id: true,
                name: true,
                billingEmail: true,
                stripeCustomerId: true,
                stripeDefaultPaymentMethodId: true,
              },
            },
            organization: {
              select: {
                slug: true,
                name: true,
                stripeConnectAccountId: true,
                stripeConnectOnboardingComplete: true,
              },
            },
          },
        },
        program: true,
      },
    }) as EnrollmentWithRelations[];

    logger.info(`Billing: ${enrollments.length} enrollment(s) due for billing`);

    // ── Check max billing cycles, remove exhausted enrollments ───────────────
    const eligible: EnrollmentWithRelations[] = [];
    for (const enrollment of enrollments) {
      if (enrollment.program.maxBillingCycles !== null) {
        const cyclesCompleted = await prisma.invoiceLineItem.count({
          where: { enrollmentId: enrollment.id },
        });
        if (cyclesCompleted >= enrollment.program.maxBillingCycles) {
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'cancelled', endDate: today, nextBillingDate: null },
          });
          logger.info(`Billing: enrollment ${enrollment.id} reached max cycles — auto-cancelled`);
          continue;
        }
      }
      eligible.push(enrollment);
    }

    // ── Partition: family-billed vs individual-billed ─────────────────────────
    //
    // An enrollment is family-billed when:
    //   - the contact belongs to a family, AND
    //   - that family has a Stripe customer + saved payment method
    //
    // Everything else is billed individually to the contact.
    //
    const familyGroups = new Map<string, EnrollmentWithRelations[]>();
    const individualEnrollments: EnrollmentWithRelations[] = [];

    for (const enrollment of eligible) {
      const family = enrollment.contact.family;
      if (family && family.stripeCustomerId && family.stripeDefaultPaymentMethodId) {
        const group = familyGroups.get(family.id) ?? [];
        group.push(enrollment);
        familyGroups.set(family.id, group);
      } else {
        individualEnrollments.push(enrollment);
      }
    }

    logger.info(
      `Billing: ${familyGroups.size} family group(s), ${individualEnrollments.length} individual enrollment(s)`
    );

    let invoicesCreated = 0;
    let autoCharged = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    // ── Family-grouped invoices ───────────────────────────────────────────────
    for (const [familyId, groupEnrollments] of familyGroups) {
      try {
        const family = groupEnrollments[0].contact.family!;
        const orgId = groupEnrollments[0].contact.organizationId;
        const orgName = groupEnrollments[0].contact.organization?.name ?? 'your organization';
        const orgSlug = groupEnrollments[0].contact.organization?.slug ?? '';

        // Use the earliest due date across the group as the invoice due date
        const dueDate = groupEnrollments.reduce<Date>((earliest, e) => {
          const d = e.nextBillingDate ?? today;
          return d < earliest ? d : earliest;
        }, groupEnrollments[0].nextBillingDate ?? today);

        const totalAmount = groupEnrollments.reduce(
          (sum, e) => sum + Number(e.program.price),
          0
        );

        const invoiceNumber = await nextInvoiceNumber();

        const invoice = await prisma.invoice.create({
          data: {
            organizationId: orgId,
            familyId,
            invoiceNumber,
            amountDue: new Decimal(totalAmount),
            dueDate,
            status: 'sent',
            notes: `Auto-generated — ${family.name}`,
            lineItems: {
              create: groupEnrollments.map((e) => ({
                enrollmentId: e.id,
                description: `${e.contact.firstName} ${e.contact.lastName} — ${e.program.name}`,
                quantity: 1,
                unitPrice: new Decimal(Number(e.program.price)),
                total: new Decimal(Number(e.program.price)),
              })),
            },
          },
        });

        invoicesCreated++;
        logger.info(
          `Billing: created family invoice ${invoiceNumber} for family ${familyId} ` +
          `(${groupEnrollments.length} line items, $${totalAmount})`
        );

        // Advance billing dates for all enrollments in the group
        for (const e of groupEnrollments) {
          const nextDate = advanceDate(e.nextBillingDate ?? today, e.program.billingFrequency);
          await prisma.enrollment.update({
            where: { id: e.id },
            data: { nextBillingDate: nextDate },
          });
        }

        // Attempt auto-charge on the family card
        const connectAccountId = groupEnrollments[0].contact.organization?.stripeConnectAccountId;
        const onboardingComplete = groupEnrollments[0].contact.organization?.stripeConnectOnboardingComplete ?? false;

        if (!connectAccountId || !onboardingComplete) {
          logger.info(`Billing: skipping auto-charge for family invoice ${invoiceNumber} — Connect not ready`);
        } else {
        try {
          const stripeTx = await stripeConnectService.chargeCustomer({
            connectAccountId,
            customerId: family.stripeCustomerId!,
            paymentMethodId: family.stripeDefaultPaymentMethodId!,
            amountCents: Math.round(totalAmount * 100),
            currency: 'USD',
            description: `Invoice ${invoiceNumber} — ${family.name}`,
            idempotencyKey: `billing-family-${invoice.id}`,
            metadata: { invoiceId: invoice.id, invoiceNumber },
          });

          await prisma.payment.create({
            data: {
              organizationId: orgId,
              invoiceId: invoice.id,
              stripePaymentIntentId: stripeTx.paymentIntentId,
              stripeChargeId: stripeTx.chargeId || null,
              amount: new Decimal(totalAmount),
              currency: 'USD',
              status: stripeTx.status,
              paymentMethodType: 'card',
              notes: 'Auto-charged via recurring billing (family card)',
            },
          });

          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'paid', amountPaid: new Decimal(totalAmount), paidAt: new Date() },
          });

          autoCharged++;
          logger.info(`Billing: auto-charged family invoice ${invoiceNumber}`);

          // Email the family billing address if set, otherwise each contact with an email
          const billingEmail = family.billingEmail;
          const emailTargets: Array<{ email: string; name: string }> = billingEmail
            ? [{ email: billingEmail, name: family.name }]
            : groupEnrollments
                .filter((e) => e.contact.email)
                .map((e) => ({
                  email: e.contact.email!,
                  name: `${e.contact.firstName} ${e.contact.lastName}`,
                }));

          for (const target of emailTargets) {
            sendPaymentReceived(target.email, {
              recipientName: target.name,
              orgName,
              invoiceNumber,
              amount: totalAmount,
              currency: 'USD',
            }).catch((err) => logger.error('Failed to send family payment received email', { err }));
          }
        } catch (chargeErr) {
          logger.warn(
            `Billing: auto-charge failed for family invoice ${invoiceNumber} — ${(chargeErr as Error).message}`
          );

          const billingEmail = family.billingEmail;
          const emailTargets: Array<{ email: string; name: string }> = billingEmail
            ? [{ email: billingEmail, name: family.name }]
            : groupEnrollments
                .filter((e) => e.contact.email)
                .map((e) => ({
                  email: e.contact.email!,
                  name: `${e.contact.firstName} ${e.contact.lastName}`,
                }));

          for (const target of emailTargets) {
            sendPaymentFailed(target.email, {
              recipientName: target.name,
              orgName,
              invoiceNumber,
              amount: totalAmount,
              currency: 'USD',
              portalUrl: `${PORTAL_URL}/${orgSlug}/invoices/${invoice.id}`,
            }).catch((err) => logger.error('Failed to send family payment failed email', { err }));
          }
        }
        } // end else (Connect ready)
      } catch (err) {
        errors++;
        const msg = `Family group ${familyId}: ${(err as Error).message}`;
        errorMessages.push(msg);
        logger.error(`Billing: error processing family group ${familyId} — ${(err as Error).message}`);
      }
    }

    // ── Individual invoices ───────────────────────────────────────────────────
    for (const enrollment of individualEnrollments) {
      try {
        const orgId = enrollment.contact.organizationId;
        const orgName = enrollment.contact.organization?.name ?? 'your organization';
        const orgSlug = enrollment.contact.organization?.slug ?? '';
        const dueDate = enrollment.nextBillingDate ?? today;
        const amount = Number(enrollment.program.price);

        const invoiceNumber = await nextInvoiceNumber();

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
        logger.info(`Billing: created individual invoice ${invoiceNumber} for enrollment ${enrollment.id}`);

        // Email the contact
        const contactEmail = enrollment.contact.email;
        const contactName = `${enrollment.contact.firstName} ${enrollment.contact.lastName}`.trim();
        if (contactEmail) {
          sendInvoiceGenerated(contactEmail, {
            recipientName: contactName,
            orgName,
            invoiceNumber,
            amount,
            currency: 'USD',
            dueDate,
            programName: enrollment.program.name,
            portalUrl: `${PORTAL_URL}/${orgSlug}/invoices/${invoice.id}`,
          }).catch((err) => logger.error('Failed to send invoice email', { err }));
        }

        // Advance billing date before attempting charge (so a charge failure doesn't block it)
        const nextDate = advanceDate(dueDate, enrollment.program.billingFrequency);
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { nextBillingDate: nextDate },
        });

        // Attempt auto-charge on the contact's card
        const connectAccountId = enrollment.contact.organization?.stripeConnectAccountId;
        const onboardingComplete = enrollment.contact.organization?.stripeConnectOnboardingComplete ?? false;
        const stripeCustomerId = enrollment.contact.stripeCustomerId;
        const stripePaymentMethodId = enrollment.contact.stripeDefaultPaymentMethodId;

        if (connectAccountId && onboardingComplete && stripeCustomerId && stripePaymentMethodId) {
          try {
            const stripeTx = await stripeConnectService.chargeCustomer({
              connectAccountId,
              customerId: stripeCustomerId,
              paymentMethodId: stripePaymentMethodId,
              amountCents: Math.round(amount * 100),
              currency: 'USD',
              description: `Invoice ${invoiceNumber} — ${enrollment.program.name}`,
              idempotencyKey: `billing-${invoice.id}`,
              metadata: { invoiceId: invoice.id, invoiceNumber },
            });

            await prisma.payment.create({
              data: {
                organizationId: orgId,
                invoiceId: invoice.id,
                stripePaymentIntentId: stripeTx.paymentIntentId,
                stripeChargeId: stripeTx.chargeId || null,
                amount: new Decimal(amount),
                currency: 'USD',
                status: stripeTx.status,
                paymentMethodType: 'card',
                notes: 'Auto-charged via recurring billing',
              },
            });

            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'paid', amountPaid: new Decimal(amount), paidAt: new Date() },
            });

            autoCharged++;
            logger.info(`Billing: auto-charged invoice ${invoiceNumber}`);

            if (contactEmail) {
              sendPaymentReceived(contactEmail, {
                recipientName: contactName,
                orgName,
                invoiceNumber,
                amount,
                currency: 'USD',
              }).catch((err) => logger.error('Failed to send payment received email', { err }));
            }
          } catch (chargeErr) {
            logger.warn(`Billing: auto-charge failed for ${invoiceNumber} — ${(chargeErr as Error).message}`);

            if (contactEmail) {
              sendPaymentFailed(contactEmail, {
                recipientName: contactName,
                orgName,
                invoiceNumber,
                amount,
                currency: 'USD',
                portalUrl: `${PORTAL_URL}/${orgSlug}/invoices/${invoice.id}`,
              }).catch((err) => logger.error('Failed to send payment failed email', { err }));
            }
          }
        }
      } catch (err) {
        errors++;
        const msg = `Enrollment ${enrollment.id} (${enrollment.contact.firstName} ${enrollment.contact.lastName} — ${enrollment.program.name}): ${(err as Error).message}`;
        errorMessages.push(msg);
        logger.error(`Billing: error processing enrollment ${enrollment.id} — ${(err as Error).message}`);
      }
    }

    // Mark overdue invoices
    await prisma.invoice.updateMany({
      where: {
        status: { in: ['draft', 'sent'] },
        dueDate: { lt: today },
        ...(organizationId ? { organizationId } : {}),
      },
      data: { status: 'overdue' },
    });

    logger.info(`Billing run complete: ${invoicesCreated} created, ${autoCharged} auto-charged, ${errors} errors`);
    return { invoicesCreated, autoCharged, errors, errorMessages, activeEnrollments: totalActive };
  }
}

export default new BillingService();
