import { Request, Response } from 'express';
import familyService from '../services/familyService';
import stripeConnectService from '../services/stripeConnectService';
import { config } from '../config/environment';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const createFamily = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { name, billingEmail } = req.body;
  const family = await familyService.createFamily({
    organizationId: req.organization!.id,
    name,
    billingEmail,
  });
  res.status(201).json({ status: 'success', data: { family } });
});

export const getFamilies = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await familyService.getFamilies(req.organization!.id, page, limit);
  res.status(200).json({ status: 'success', data: result });
});

export const getFamily = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const family = await familyService.getFamilyById(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { family } });
});

export const updateFamily = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { name, billingEmail } = req.body;
  const family = await familyService.updateFamily(req.params.id, req.organization!.id, { name, billingEmail });
  res.status(200).json({ status: 'success', data: { family } });
});

export const deleteFamily = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  await familyService.deleteFamily(req.params.id, req.organization!.id);
  res.status(204).send();
});

export const initializeFamilyCardCheckout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const family = await familyService.getFamilyById(req.params.id, req.organization!.id);

  const org = await prisma.organization.findUnique({
    where: { id: req.organization!.id },
    select: { stripeConnectAccountId: true },
  });
  if (!org?.stripeConnectAccountId) throw new AppError(503, 'Payment processing not configured for this organization');

  let stripeCustomerId = (family as { stripeCustomerId?: string | null }).stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    stripeCustomerId = await stripeConnectService.createCustomer(
      org.stripeConnectAccountId,
      family.billingEmail ?? undefined,
      family.name
    );
    await prisma.family.update({ where: { id: req.params.id }, data: { stripeCustomerId } });
  }

  const clientSecret = await stripeConnectService.createSetupIntent(org.stripeConnectAccountId, stripeCustomerId);

  res.status(200).json({
    status: 'success',
    data: { clientSecret, connectAccountId: org.stripeConnectAccountId, publishableKey: config.stripe.publishableKey, customerId: stripeCustomerId },
  });
});

export const saveFamilyCardToken = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { stripeCustomerId, stripeDefaultPaymentMethodId } = req.body;
  if (!stripeCustomerId) throw new AppError(400, 'stripeCustomerId is required');
  if (!stripeDefaultPaymentMethodId) throw new AppError(400, 'stripeDefaultPaymentMethodId is required');
  await familyService.getFamilyById(req.params.id, req.organization!.id);
  const family = await prisma.family.update({
    where: { id: req.params.id },
    data: { stripeCustomerId, stripeDefaultPaymentMethodId },
  });
  res.status(200).json({ status: 'success', data: { family } });
});
