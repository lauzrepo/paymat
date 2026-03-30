import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import helcimService from '../services/helcimService';
import stripeService from '../services/stripeService';
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
    const eventType = String(payload.eventType ?? payload.event ?? '').toLowerCase();
    const status = String(
      (payload.status as string | undefined) ??
      ((payload.data as Record<string, unknown>)?.status as string | undefined) ?? ''
    ).toLowerCase();
    const amount = Number(
      (payload.amount as number | undefined) ??
      ((payload.data as Record<string, unknown>)?.amount as number | undefined) ?? 0
    );

    if (!transactionId) {
      res.status(200).json({ received: true });
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: { helcimTransactionId: transactionId },
      include: { invoice: { include: { contact: true } } },
    });

    if (!payment) {
      logger.info(`Helcim webhook: no payment found for txn ${transactionId}`);
      res.status(200).json({ received: true });
      return;
    }

    // Payment approved/succeeded
    if (
      eventType.includes('payment') && (status === 'approved' || status === 'succeeded') ||
      eventType === 'purchase' && status === 'approved'
    ) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'succeeded' } });

      const invoice = payment.invoice;
      const newAmountPaid = Number(invoice.amountPaid) + amount;
      if (newAmountPaid >= Number(invoice.amountDue)) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'paid', amountPaid: new Decimal(newAmountPaid), paidAt: new Date() },
        });
      } else {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { amountPaid: new Decimal(newAmountPaid) },
        });
      }
      logger.info(`Helcim webhook: payment ${payment.id} marked succeeded`);
    }

    // Payment declined/failed
    if (status === 'declined' || status === 'failed' || eventType.includes('failed')) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
      logger.info(`Helcim webhook: payment ${payment.id} marked failed`);
    }

    // Refund
    if (eventType.includes('refund') || status === 'refunded') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } });
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'sent', amountPaid: new Decimal(0), paidAt: null },
      });
      logger.info(`Helcim webhook: payment ${payment.id} marked refunded`);
    }
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
