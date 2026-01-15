import { Request, Response } from 'express';
import paymentService from '../services/paymentService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import prisma from '../config/database';

/**
 * Create and process a payment
 * POST /api/payments/create
 */
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { amount, currency, cardToken, description, paymentMethodId } = req.body;

  const payment = await paymentService.processPayment({
    userId: req.user.userId,
    amount,
    currency,
    cardToken,
    description,
    paymentMethodId,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'PAYMENT_CREATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { paymentId: payment.id, amount, currency },
    },
  });

  logger.info(`Payment created: ${payment.id} by user ${req.user.email}`);

  res.status(201).json({
    status: 'success',
    data: { payment },
  });
});

/**
 * Get payment history
 * GET /api/payments/history
 */
export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string | undefined;

  const result = await paymentService.getPaymentHistory(req.user.userId, page, limit, status);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * Get single payment
 * GET /api/payments/:id
 */
export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const payment = await paymentService.getPaymentById(id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

/**
 * Refund a payment
 * POST /api/payments/:id/refund
 */
export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;
  const { amount, reason } = req.body;

  const refund = await paymentService.refundPayment(id, req.user.userId, amount, reason);

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'PAYMENT_REFUNDED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { paymentId: id, amount, reason },
    },
  });

  logger.info(`Payment refunded: ${id} by user ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    data: { refund },
  });
});

/**
 * Get payment statistics
 * GET /api/payments/stats
 */
export const getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const stats = await paymentService.getPaymentStats(req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});
