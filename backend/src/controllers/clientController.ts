import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import stripeConnectService from '../services/stripeConnectService';
import { sendPaymentReceived } from '../services/emailService';
import logger from '../utils/logger';

// GET /api/client/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: {
      contact: {
        include: {
          family: true,
          enrollments: {
            where: { status: 'active' },
            include: { program: true },
          },
        },
      },
    },
  });

  if (!user) throw new AppError(404, 'User not found');

  res.json({ status: 'success', data: { user } });
});

// GET /api/client/enrollments
export const getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user?.contactId) {
    res.json({ status: 'success', data: { enrollments: [] } }); return;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { contactId: user.contactId },
    include: { program: true },
    orderBy: { startDate: 'desc' },
  });

  res.json({ status: 'success', data: { enrollments } });
});

// GET /api/client/invoices
export const getMyInvoices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { contact: true },
  });

  if (!user?.contactId) {
    res.json({ status: 'success', data: { invoices: [], total: 0 } }); return;
  }

  const familyId = user.contact?.familyId ?? null;

  const where = {
    organizationId: req.organization!.id,
    OR: [
      { contactId: user.contactId },
      ...(familyId ? [{ familyId }] : []),
    ],
  };

  const page = Math.max(1, parseInt(String(req.query.page ?? 1), 10));
  const limit = 20;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { lineItems: true, payments: true },
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({ status: 'success', data: { invoices, total, page } });
});

// GET /api/client/invoices/:id
export const getMyInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { contact: true },
  });

  if (!user?.contactId) throw new AppError(403, 'No contact record linked to your account');

  const familyId = user.contact?.familyId ?? null;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: req.params.id as string,
      organizationId: req.organization!.id,
      OR: [
        { contactId: user.contactId },
        ...(familyId ? [{ familyId }] : []),
      ],
    },
    include: { lineItems: true, payments: true },
  });

  if (!invoice) throw new AppError(404, 'Invoice not found');

  res.json({ status: 'success', data: { invoice } });
});

// POST /api/client/invoices/:id/initialize-payment
export const initializeInvoicePayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { contact: true },
  });

  if (!user?.contactId) throw new AppError(403, 'No contact record linked to your account');

  const familyId = user.contact?.familyId ?? null;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: req.params.id as string,
      organizationId: req.organization!.id,
      status: { in: ['draft', 'sent', 'overdue'] },
      OR: [
        { contactId: user.contactId },
        ...(familyId ? [{ familyId }] : []),
      ],
    },
  });

  if (!invoice) throw new AppError(404, 'Invoice not found or not payable');

  const amountDue = Number(invoice.amountDue) - Number(invoice.amountPaid);
  if (amountDue <= 0) throw new AppError(400, 'Invoice has no outstanding balance');

  const org = await prisma.organization.findUnique({
    where: { id: req.organization!.id },
    select: { stripeConnectAccountId: true, platformFeePercent: true, sandboxMode: true },
  });
  if (!org?.stripeConnectAccountId) {
    throw new AppError(503, 'Payment processing is not yet configured for this organization');
  }

  const { sandboxMode } = org;

  // Get or create a Stripe customer for this contact on the connected account
  const contact = await prisma.contact.findUnique({
    where: { id: user.contactId! },
    select: { stripeCustomerId: true, email: true, firstName: true, lastName: true },
  });

  let stripeCustomerId = contact?.stripeCustomerId ?? null;
  if (!stripeCustomerId && contact?.email) {
    stripeCustomerId = await stripeConnectService.createCustomer(
      org.stripeConnectAccountId,
      contact.email,
      `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim(),
      sandboxMode
    );
    await prisma.contact.update({
      where: { id: user.contactId! },
      data: { stripeCustomerId },
    });
  }

  const { clientSecret, paymentIntentId } = await stripeConnectService.createPaymentIntent(
    org.stripeConnectAccountId,
    Math.round(amountDue * 100),
    invoice.currency,
    stripeCustomerId,
    { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    org.platformFeePercent,
    sandboxMode
  );

  res.json({
    status: 'success',
    data: {
      clientSecret,
      paymentIntentId,
      connectAccountId: org.stripeConnectAccountId,
      publishableKey: stripeConnectService.getPublishableKey(sandboxMode),
      amountCents: Math.round(amountDue * 100),
      currency: invoice.currency,
    },
  });
});

// POST /api/client/invoices/:id/confirm-payment
// Called by the frontend immediately after stripe.confirmPayment() resolves.
// Retrieves the PaymentIntent from Stripe and records the payment + marks the
// invoice paid — mirrors the Connect webhook logic so the DB is updated even
// when webhooks are not yet configured.
export const confirmInvoicePayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const { paymentIntentId } = req.body as { paymentIntentId?: string };
  if (!paymentIntentId) throw new AppError(400, 'paymentIntentId is required');

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { contact: true },
  });
  if (!user?.contactId) throw new AppError(403, 'No contact record linked to your account');

  const familyId = user.contact?.familyId ?? null;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: req.params.id as string,
      organizationId: req.organization!.id,
      OR: [
        { contactId: user.contactId },
        ...(familyId ? [{ familyId }] : []),
      ],
    },
    include: {
      contact: { select: { email: true, firstName: true, lastName: true } },
      family: { select: { billingEmail: true, name: true } },
    },
  });

  if (!invoice) throw new AppError(404, 'Invoice not found');

  const org = await prisma.organization.findUnique({
    where: { id: req.organization!.id },
    select: { stripeConnectAccountId: true, name: true, sandboxMode: true },
  });
  if (!org?.stripeConnectAccountId) throw new AppError(503, 'Payment processing not configured');

  // Retrieve and verify the PaymentIntent from Stripe
  const intent = await stripeConnectService.retrievePaymentIntent(
    org.stripeConnectAccountId,
    paymentIntentId,
    org.sandboxMode
  );

  if (intent.status !== 'succeeded') {
    throw new AppError(400, `Payment has not succeeded (status: ${intent.status})`);
  }

  // Verify the PaymentIntent belongs to this invoice
  if (intent.metadata?.invoiceId !== invoice.id) {
    throw new AppError(403, 'PaymentIntent does not match this invoice');
  }

  const amount = intent.amount / 100;
  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : null;

  // Upsert payment record (idempotent — webhook may also fire later)
  const existing = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: intent.id },
  });

  if (!existing) {
    await prisma.payment.create({
      data: {
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
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

  const newAmountPaid = Number(invoice.amountPaid) + (existing ? 0 : amount);
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

  const recipientEmail = invoice.family?.billingEmail ?? invoice.contact?.email ?? null;
  const recipientName = invoice.family?.name
    ?? `${invoice.contact?.firstName ?? ''} ${invoice.contact?.lastName ?? ''}`.trim();

  if (recipientEmail && !existing) {
    sendPaymentReceived(recipientEmail, {
      recipientName,
      orgName: org.name,
      invoiceNumber: invoice.invoiceNumber,
      amount,
      currency: intent.currency.toUpperCase(),
    }).catch((err) => logger.error('Failed to send payment received email', { err }));
  }

  logger.info(`[ClientAPI] invoice ${invoice.id} payment confirmed by client ($${amount})`);

  const updatedInvoice = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { lineItems: true, payments: true },
  });

  res.json({ status: 'success', data: { invoice: updatedInvoice } });
});

// GET /api/client/payments
export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { contact: true },
  });

  if (!user?.contactId) {
    res.json({ status: 'success', data: { payments: [], total: 0 } }); return;
  }

  const familyId = user.contact?.familyId ?? null;

  const invoiceWhere = {
    organizationId: req.organization!.id,
    OR: [
      { contactId: user.contactId },
      ...(familyId ? [{ familyId }] : []),
    ],
  };

  // Get invoice IDs the client owns
  const myInvoices = await prisma.invoice.findMany({ where: invoiceWhere, select: { id: true } });
  const invoiceIds = myInvoices.map((i) => i.id);

  const page = Math.max(1, parseInt(String(req.query.page ?? 1), 10));
  const limit = 20;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { invoiceId: { in: invoiceIds } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { invoiceNumber: true, amountDue: true } } },
    }),
    prisma.payment.count({ where: { invoiceId: { in: invoiceIds } } }),
  ]);

  res.json({ status: 'success', data: { payments, total, page } });
});
