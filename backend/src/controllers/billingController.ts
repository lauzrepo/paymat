import { Request, Response, NextFunction } from 'express';
import billingService from '../services/billingService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { config } from '../config/environment';

export const runBilling = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  // Accept either JWT-authenticated admin OR BILLING_SECRET header for cron callers
  const secretHeader = req.headers['x-billing-secret'];
  const isAdminUser = !!req.user;
  const isValidSecret = config.billing.secret && secretHeader === config.billing.secret;

  if (!isAdminUser && !isValidSecret) {
    throw new AppError(401, 'Unauthorized');
  }

  const organizationId = req.organization?.id;
  const result = await billingService.generateDueInvoices(organizationId);

  res.status(200).json({ status: 'success', data: result });
});
