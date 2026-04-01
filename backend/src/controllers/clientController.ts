import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import stripeConnectService from '../services/stripeConnectService';
import { config } from '../config/environment';

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
      id: req.params.id,
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
      id: req.params.id,
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
    select: { stripeConnectAccountId: true, stripeConnectOnboardingComplete: true },
  });
  if (!org?.stripeConnectAccountId || !org.stripeConnectOnboardingComplete) {
    throw new AppError(503, 'Payment processing is not yet configured for this organization');
  }

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
      `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
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
    { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }
  );

  res.json({
    status: 'success',
    data: {
      clientSecret,
      paymentIntentId,
      connectAccountId: org.stripeConnectAccountId,
      publishableKey: config.stripe.publishableKey,
      amountCents: Math.round(amountDue * 100),
      currency: invoice.currency,
    },
  });
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
