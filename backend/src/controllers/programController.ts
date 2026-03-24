import { Request, Response } from 'express';
import programService from '../services/programService';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { name, description, price, billingFrequency, capacity } = req.body;
  const program = await programService.createProgram({
    organizationId: req.organization!.id,
    name,
    description,
    price,
    billingFrequency,
    capacity,
  });
  res.status(201).json({ status: 'success', data: { program } });
});

export const getPrograms = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const activeOnly = req.query.activeOnly === 'true';
  const result = await programService.getPrograms(req.organization!.id, page, limit, activeOnly);
  res.status(200).json({ status: 'success', data: result });
});

export const getProgram = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const program = await programService.getProgramById(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { program } });
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const program = await programService.updateProgram(req.params.id, req.organization!.id, req.body);
  res.status(200).json({ status: 'success', data: { program } });
});
