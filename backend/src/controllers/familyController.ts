import { Request, Response } from 'express';
import familyService from '../services/familyService';
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
