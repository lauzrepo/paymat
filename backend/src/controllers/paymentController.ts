import { Request, Response } from 'express';
import paymentService from '../services/paymentService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import prisma from '../config/database';

export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { invoiceId, amount, currency, cardToken, paymentMethodType, notes } = req.body;

  const payment = await paymentService.processPayment({
    organizationId: req.organization!.id,
    invoiceId,
    userId: req.user.userId,
    amount,
    currency,
    cardToken,
    paymentMethodType,
    notes,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: req.organization!.id,
      userId: req.user.userId,
      action: 'PAYMENT_PROCESSED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { paymentId: payment.id, invoiceId, amount },
    },
  });

  res.status(201).json({ status: 'success', data: { payment } });
});

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await paymentService.getPayments(req.organization!.id, page, limit, {
    status: req.query.status as string | undefined,
    invoiceId: req.query.invoiceId as string | undefined,
  });
  res.status(200).json({ status: 'success', data: result });
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const payment = await paymentService.getPaymentById(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { payment } });
});

export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { amount, reason } = req.body;

  await paymentService.refundPayment(req.params.id, req.organization!.id, amount, reason);

  await prisma.auditLog.create({
    data: {
      organizationId: req.organization!.id,
      userId: req.user.userId,
      action: 'PAYMENT_REFUNDED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { paymentId: req.params.id, amount, reason },
    },
  });

  res.status(200).json({ status: 'success', message: 'Payment refunded successfully' });
});

export const getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const stats = await paymentService.getStats(req.organization!.id);
  res.status(200).json({ status: 'success', data: { stats } });
});
