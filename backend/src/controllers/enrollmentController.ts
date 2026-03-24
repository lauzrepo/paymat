import { Request, Response } from 'express';
import enrollmentService from '../services/enrollmentService';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const enroll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { contactId, programId, startDate } = req.body;
  const enrollment = await enrollmentService.enroll({
    organizationId: req.organization!.id,
    contactId,
    programId,
    startDate: new Date(startDate),
  });
  res.status(201).json({ status: 'success', data: { enrollment } });
});

export const getEnrollments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await enrollmentService.getEnrollments(req.organization!.id, page, limit, {
    status: req.query.status as string | undefined,
    contactId: req.query.contactId as string | undefined,
    programId: req.query.programId as string | undefined,
  });
  res.status(200).json({ status: 'success', data: result });
});

export const getEnrollment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const enrollment = await enrollmentService.getEnrollmentById(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { enrollment } });
});

export const unenroll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { endDate } = req.body;
  const enrollment = await enrollmentService.unenroll(req.params.id, req.organization!.id, endDate ? new Date(endDate) : undefined);
  res.status(200).json({ status: 'success', data: { enrollment } });
});

export const pauseEnrollment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const enrollment = await enrollmentService.pauseEnrollment(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { enrollment } });
});

export const resumeEnrollment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const enrollment = await enrollmentService.resumeEnrollment(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { enrollment } });
});
