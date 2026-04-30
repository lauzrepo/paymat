import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;
import prisma from '../config/database';
import helcimService from '../services/helcimService';
import stripeService from '../services/stripeService';
import stripeConnectService from '../services/stripeConnectService';
import { sendPaymentReceived, sendPaymentFailed, sendOrgPaymentReceipt } from '../services/emailService';
import { config } from '../config/environment';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Helcim webhook
// ---------------------------------------------------------------------------

export const handleHelcimWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-helcim-signature'] as string | undefined;

  if (!signature) {
    logger.warn('Helcim webhook: missing signature header');
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  const isValid = helcimService.verifyWebhookSignature(rawBody.toString(), signature);
  if (!isValid) {
    logger.warn('Helcim webhook: invalid signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  logger.info('Helcim webhook received', { payload });

  try {
    const transactionId = String(
      (payload.transactionId as string | number | undefined) ??
      ((payload.data as Record<string, unknown>)?.transactionId as string | number | undefined) ?? ''
    );

    if (!transactionId) {
      res.status(200).json({ received: true });
      return;
    }

    // Helcim payments are no longer created — this handler is kept for legacy transition only
    logger.info(`Helcim webhook: legacy event received for txn ${transactionId} — no action taken`);
  } catch (err) {
    logger.error('Helcim webhook: error processing event', { err });
  }

  res.status(200).json({ received: true });
};

// ---------------------------------------------------------------------------
// Stripe webhook
// ---------------------------------------------------------------------------

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body as Buffer;
  const signature = req.headers['stripe-signature'] as string | undefined;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: ReturnType<typeof stripeService.constructWebhookEvent>;
  try {
    event = stripeService.constructWebhookEvent(rawBody, signature);
  } catch (err) {
    logger.warn('Stripe webhook: invalid signature', { err });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  logger.info(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { metadata?: { organizationId?: string }; customer?: string; subscription?: string };
        const orgId = session.metadata?.organizationId;
        if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: 'active',
            },
          });
          logger.info(`Stripe: org ${orgId} subscription activated`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as { id: string; status: string; metadata?: { organizationId?: string } };
        const org = await prisma.organization.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { subscriptionStatus: sub.status },
          });
          logger.info(`Stripe: org ${org.id} subscription status → ${sub.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };
        const org = await prisma.organization.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { subscriptionStatus: 'canceled' },
          });
          logger.info(`Stripe: org ${org.id} subscription canceled`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as { customer?: string };
        const org = await prisma.organization.findFirst({ where: { stripeCustomerId: inv.customer as string } });
        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { subscriptionStatus: 'past_due' },
          });
          logger.info(`Stripe: org ${org.id} payment failed → past_due`);
        }
        break;
      }
    }
  } catch (err) {
    logger.error('Stripe webhook: error processing event', { err });
  }

  res.status(200).json({ received: true });
};

// ---------------------------------------------------------------------------
// Stripe Connect webhook (events from connected accounts)
// ---------------------------------------------------------------------------

const PORTAL_URL = config.email.appUrl.replace('app.', 'portal.');

export const handleStripeConnectWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body as Buffer;
  const signature = req.headers['stripe-signature'] as string | undefined;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: ReturnType<typeof stripeConnectService.constructWebhookEvent>;
  try {
    event = stripeConnectService.constructWebhookEvent(rawBody, signature, config.stripe.connectWebhookSecret);
  } catch (err) {
    logger.warn('Stripe Connect webhook: invalid signature', { err });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  logger.info(`Stripe Connect webhook: ${event.type} (account: ${event.account ?? 'unknown'})`);

  try {
    switch (event.type) {

      // ── Payment succeeded (portal self-serve or auto-charge) ──────────────
      case 'payment_intent.succeeded': {
        const intent = event.data.object as {
          id: string;
          amount: number;
          currency: string;
          latest_charge?: string;
          metadata?: { invoiceId?: string; invoiceNumber?: string };
        };

        const invoiceId = intent.metadata?.invoiceId;
        const invoiceNumber = intent.metadata?.invoiceNumber ?? '';
        const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : null;
        const amount = intent.amount / 100;

        if (!invoiceId) break;

        const existing = await prisma.payment.findFirst({
          where: { stripePaymentIntentId: intent.id },
        });

        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            contact: { select: { email: true, firstName: true, lastName: true } },
            family: { select: { billingEmail: true, name: true } },
          },
        });
        if (!invoice) break;

        if (!existing) {
          await prisma.payment.create({
            data: {
              organizationId: invoice.organizationId,
              invoiceId,
              stripePaymentIntentId: intent.id,
              stripeChargeId: chargeId,
              amount: new Decimal(amount),
              currency: intent.currency.toUpperCase(),
              status: 'succeeded',
              paymentMethodType: 'card',
              notes: 'Paid via member portal',
            },
          });
        } else if (chargeId && !existing.stripeChargeId) {
          await prisma.payment.update({
            where: { id: existing.id },
            data: { stripeChargeId: chargeId, status: 'succeeded' },
          });
        }

        const newAmountPaid = Number(invoice.amountPaid) + amount;
        if (newAmountPaid >= Number(invoice.amountDue)) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'paid', amountPaid: new Decimal(newAmountPaid), paidAt: new Date() },
          });
        } else {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { amountPaid: new Decimal(newAmountPaid) },
          });
        }

        const org = await prisma.organization.findUnique({
          where: { id: invoice.organizationId },
          select: {
            name: true,
            sandboxMode: true,
            platformFeePercent: true,
            stripeConnectAccountId: true,
            users: { where: { role: 'admin', deletedAt: null }, select: { email: true, firstName: true, lastName: true } },
          },
        });
        const orgName = org?.name ?? 'your organization';

        const recipientEmail = invoice.family?.billingEmail ?? invoice.contact?.email ?? null;
        const recipientName = invoice.family?.name
          ?? `${invoice.contact?.firstName ?? ''} ${invoice.contact?.lastName ?? ''}`.trim();

        if (recipientEmail) {
          sendPaymentReceived(recipientEmail, {
            recipientName,
            orgName,
            invoiceNumber,
            amount,
            currency: intent.currency.toUpperCase(),
          }).catch((err) => logger.error('Failed to send payment received email', { err }));
        }

        // Org admin receipt with fee breakdown
        if (org?.users.length) {
          const platformFee = amount * ((org.platformFeePercent ?? 0) / 100);
          const fees = chargeId && org.stripeConnectAccountId
            ? await stripeConnectService.getChargeFees(chargeId, org.stripeConnectAccountId, org.sandboxMode ?? true).catch(() => null)
            : null;

          for (const admin of org.users) {
            sendOrgPaymentReceipt(admin.email, {
              orgAdminName: admin.firstName ?? 'there',
              orgName,
              memberName: recipientName || 'Member',
              invoiceNumber,
              grossAmount: amount,
              platformFee,
              stripeFee: fees?.stripeFee ?? null,
              netAmount: fees?.net ?? null,
              currency: intent.currency.toUpperCase(),
            }).catch((err) => logger.error('Failed to send org payment receipt', { err }));
          }
        }

        logger.info(`Stripe Connect: invoice ${invoiceId} payment succeeded ($${amount})`);
        break;
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as {
          id: string;
          amount: number;
          currency: string;
          metadata?: { invoiceId?: string; invoiceNumber?: string };
        };

        const invoiceId = intent.metadata?.invoiceId;
        const invoiceNumber = intent.metadata?.invoiceNumber ?? '';
        if (!invoiceId) break;

        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: 'failed' },
        });

        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            contact: { select: { email: true, firstName: true, lastName: true } },
            family: { select: { billingEmail: true, name: true } },
          },
        });
        if (!invoice) break;

        const orgName = (await prisma.organization.findUnique({
          where: { id: invoice.organizationId },
          select: { name: true },
        }))?.name ?? 'your organization';

        const recipientEmail = invoice.family?.billingEmail ?? invoice.contact?.email ?? null;
        const recipientName = invoice.family?.name
          ?? `${invoice.contact?.firstName ?? ''} ${invoice.contact?.lastName ?? ''}`.trim();

        if (recipientEmail) {
          sendPaymentFailed(recipientEmail, {
            recipientName,
            orgName,
            invoiceNumber,
            amount: intent.amount / 100,
            currency: intent.currency.toUpperCase(),
            portalUrl: `${PORTAL_URL}/invoices/${invoiceId}`,
          }).catch((err) => logger.error('Failed to send payment failed email', { err }));
        }

        logger.info(`Stripe Connect: payment failed for invoice ${invoiceId}`);
        break;
      }

      // ── Connect account updated (onboarding complete) ──────────────────────
      case 'account.updated': {
        const account = event.data.object as {
          id: string;
          charges_enabled: boolean;
          details_submitted: boolean;
        };

        const org = await prisma.organization.findFirst({
          where: { stripeConnectAccountId: account.id },
        });

        if (org) {
          const complete = account.charges_enabled && account.details_submitted;
          await prisma.organization.update({
            where: { id: org.id },
            data: { stripeConnectOnboardingComplete: complete },
          });
          logger.info(`Stripe Connect: org ${org.id} onboarding complete=${complete}`);
        }
        break;
      }

      // ── Refund completed ───────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object as { id: string; amount_refunded: number };
        const payment = await prisma.payment.findFirst({ where: { stripeChargeId: charge.id } });
        if (payment) {
          await prisma.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } });
          const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
          if (invoice) {
            const refundedAmount = charge.amount_refunded / 100;
            const newPaid = Math.max(0, Number(invoice.amountPaid) - refundedAmount);
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { amountPaid: new Decimal(newPaid), status: 'sent', paidAt: null },
            });
          }
          logger.info(`Stripe Connect: charge ${charge.id} refunded`);
        }
        break;
      }
    }
  } catch (err) {
    logger.error('Stripe Connect webhook: error processing event', { err });
  }

  res.status(200).json({ received: true });
};
