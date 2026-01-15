import { Request, Response } from 'express';
import subscriptionService from '../services/subscriptionService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import prisma from '../config/database';

/**
 * Get all available subscription plans
 * GET /api/subscriptions/plans
 */
export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const plans = subscriptionService.getPlans();

  res.status(200).json({
    status: 'success',
    data: { plans },
  });
});

/**
 * Create a new subscription
 * POST /api/subscriptions/create
 */
export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { planId, cardToken } = req.body;

  if (!planId || !cardToken) {
    throw new AppError(400, 'Plan ID and card token are required');
  }

  const subscription = await subscriptionService.createSubscription(
    req.user.userId,
    planId,
    cardToken
  );

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'SUBSCRIPTION_CREATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { subscriptionId: subscription.id, planId },
    },
  });

  logger.info(`Subscription created: ${subscription.id} by user ${req.user.email}`);

  res.status(201).json({
    status: 'success',
    data: { subscription },
  });
});

/**
 * Get active subscriptions
 * GET /api/subscriptions/active
 */
export const getActiveSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const subscriptions = await subscriptionService.getActiveSubscriptions(req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { subscriptions },
  });
});

/**
 * Get single subscription
 * GET /api/subscriptions/:id
 */
export const getSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const subscription = await subscriptionService.getSubscriptionById(id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { subscription },
  });
});

/**
 * Cancel a subscription
 * PUT /api/subscriptions/:id/cancel
 */
export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;
  const { cancelAtPeriodEnd = true } = req.body;

  const subscription = await subscriptionService.cancelSubscription(
    id,
    req.user.userId,
    cancelAtPeriodEnd
  );

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'SUBSCRIPTION_CANCELED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { subscriptionId: id, cancelAtPeriodEnd },
    },
  });

  logger.info(`Subscription canceled: ${id} by user ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    data: { subscription },
  });
});

/**
 * Update subscription plan
 * PUT /api/subscriptions/:id/update
 */
export const updateSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;
  const { planId } = req.body;

  if (!planId) {
    throw new AppError(400, 'New plan ID is required');
  }

  const subscription = await subscriptionService.updateSubscription(
    id,
    req.user.userId,
    planId
  );

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'SUBSCRIPTION_UPDATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { subscriptionId: id, newPlanId: planId },
    },
  });

  logger.info(`Subscription updated: ${id} by user ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    data: { subscription },
  });
});

/**
 * Reactivate a canceled subscription
 * PUT /api/subscriptions/:id/reactivate
 */
export const reactivateSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const subscription = await subscriptionService.reactivateSubscription(id, req.user.userId);

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'SUBSCRIPTION_REACTIVATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { subscriptionId: id },
    },
  });

  logger.info(`Subscription reactivated: ${id} by user ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    data: { subscription },
  });
});
