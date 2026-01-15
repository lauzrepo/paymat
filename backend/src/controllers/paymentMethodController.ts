import { Request, Response } from 'express';
import paymentMethodService from '../services/paymentMethodService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import prisma from '../config/database';

/**
 * Save a payment method
 * POST /api/payment-methods/attach
 */
export const savePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { cardToken, last4, brand, expMonth, expYear, cardholderName, setAsDefault } = req.body;

  if (!cardToken || !last4 || !brand || !expMonth || !expYear) {
    throw new AppError(400, 'Missing required payment method data');
  }

  const paymentMethod = await paymentMethodService.savePaymentMethod({
    userId: req.user.userId,
    cardToken,
    last4,
    brand,
    expMonth,
    expYear,
    cardholderName,
    setAsDefault,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'PAYMENT_METHOD_SAVED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { paymentMethodId: paymentMethod.id },
    },
  });

  logger.info(`Payment method saved by user ${req.user.email}`);

  res.status(201).json({
    status: 'success',
    data: { paymentMethod },
  });
});

/**
 * Get all payment methods
 * GET /api/payment-methods
 */
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const paymentMethods = await paymentMethodService.getPaymentMethods(req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { paymentMethods },
  });
});

/**
 * Delete a payment method
 * DELETE /api/payment-methods/:id
 */
export const deletePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  await paymentMethodService.deletePaymentMethod(id, req.user.userId);

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'PAYMENT_METHOD_DELETED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { paymentMethodId: id },
    },
  });

  logger.info(`Payment method deleted by user ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Payment method deleted successfully',
  });
});

/**
 * Set payment method as default
 * PUT /api/payment-methods/:id/default
 */
export const setDefaultPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const paymentMethod = await paymentMethodService.setAsDefault(id, req.user.userId);

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'PAYMENT_METHOD_SET_DEFAULT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { paymentMethodId: id },
    },
  });

  logger.info(`Payment method set as default by user ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    data: { paymentMethod },
  });
});
