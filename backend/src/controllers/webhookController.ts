import { Request, Response } from 'express';
import helcimService from '../services/helcimService';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Handle Helcim webhooks
 * POST /api/webhooks/helcim
 */
export const handleHelcimWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-helcim-signature'] as string;
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  if (!helcimService.verifyWebhookSignature(payload, signature)) {
    logger.warn('Invalid webhook signature received');
    throw new AppError(401, 'Invalid webhook signature');
  }

  const { event, data } = req.body;

  logger.info(`Webhook received: ${event}`);

  try {
    switch (event) {
      case 'transaction.success':
        await handleTransactionSuccess(data);
        break;

      case 'transaction.declined':
        await handleTransactionDeclined(data);
        break;

      case 'transaction.refunded':
        await handleTransactionRefunded(data);
        break;

      case 'recurring.created':
        await handleRecurringCreated(data);
        break;

      case 'recurring.cancelled':
        await handleRecurringCancelled(data);
        break;

      case 'recurring.payment.success':
        await handleRecurringPaymentSuccess(data);
        break;

      case 'recurring.payment.failed':
        await handleRecurringPaymentFailed(data);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(data);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(data);
        break;

      case 'invoice.overdue':
        await handleInvoiceOverdue(data);
        break;

      case 'cardtoken.created':
        await handleCardTokenCreated(data);
        break;

      case 'cardtoken.deleted':
        await handleCardTokenDeleted(data);
        break;

      default:
        logger.warn(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Webhook processing error for event ${event}:`, error);
    throw new AppError(500, 'Webhook processing failed');
  }
});

// Webhook event handlers

async function handleTransactionSuccess(data: any) {
  logger.info(`Transaction success: ${data.transactionId}`);

  await prisma.payment.updateMany({
    where: { helcimTransactionId: data.transactionId },
    data: {
      status: 'completed',
      metadata: data,
    },
  });
}

async function handleTransactionDeclined(data: any) {
  logger.info(`Transaction declined: ${data.transactionId}`);

  await prisma.payment.updateMany({
    where: { helcimTransactionId: data.transactionId },
    data: {
      status: 'declined',
      metadata: data,
    },
  });
}

async function handleTransactionRefunded(data: any) {
  logger.info(`Transaction refunded: ${data.transactionId}`);

  await prisma.payment.updateMany({
    where: { helcimTransactionId: data.transactionId },
    data: {
      status: 'refunded',
      metadata: data,
    },
  });
}

async function handleRecurringCreated(data: any) {
  logger.info(`Recurring plan created: ${data.recurringId}`);
  // Subscription already created in the database
}

async function handleRecurringCancelled(data: any) {
  logger.info(`Recurring plan cancelled: ${data.recurringId}`);

  await prisma.subscription.updateMany({
    where: { helcimSubscriptionId: data.recurringId },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
    },
  });
}

async function handleRecurringPaymentSuccess(data: any) {
  logger.info(`Recurring payment success: ${data.recurringId}`);

  // Update subscription next billing date
  const subscription = await prisma.subscription.findFirst({
    where: { helcimSubscriptionId: data.recurringId },
  });

  if (subscription) {
    const nextBillingDate = new Date();
    if (subscription.billingFrequency === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextBillingDate,
        nextBillingDate,
      },
    });
  }
}

async function handleRecurringPaymentFailed(data: any) {
  logger.error(`Recurring payment failed: ${data.recurringId}`);

  // Optionally update subscription status or send notification
  await prisma.subscription.updateMany({
    where: { helcimSubscriptionId: data.recurringId },
    data: {
      status: 'past_due',
    },
  });
}

async function handleInvoiceCreated(data: any) {
  logger.info(`Invoice created: ${data.invoiceId}`);
  // Invoice already created in the database
}

async function handleInvoicePaid(data: any) {
  logger.info(`Invoice paid: ${data.invoiceId}`);

  await prisma.invoice.updateMany({
    where: { helcimInvoiceId: data.invoiceId },
    data: {
      status: 'paid',
      paidAt: new Date(),
      amountPaid: data.amountPaid,
    },
  });
}

async function handleInvoiceOverdue(data: any) {
  logger.warn(`Invoice overdue: ${data.invoiceId}`);

  await prisma.invoice.updateMany({
    where: { helcimInvoiceId: data.invoiceId },
    data: {
      status: 'overdue',
    },
  });
}

async function handleCardTokenCreated(data: any) {
  logger.info(`Card token created: ${data.cardToken}`);
  // Payment method will be created when user saves it
}

async function handleCardTokenDeleted(data: any) {
  logger.info(`Card token deleted: ${data.cardToken}`);

  await prisma.paymentMethod.deleteMany({
    where: { helcimCardToken: data.cardToken },
  });
}
