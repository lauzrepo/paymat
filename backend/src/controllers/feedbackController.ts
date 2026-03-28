import { Request, Response } from 'express';
import feedbackService from '../services/feedbackService';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const VALID_TYPES = ['feedback', 'bug', 'question'] as const;
const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, type, subject, message, contactId } = req.body;

  if (!name?.trim()) throw new AppError(400, 'Name is required');
  if (!subject?.trim()) throw new AppError(400, 'Subject is required');
  if (!message?.trim()) throw new AppError(400, 'Message is required');
  if (type && !VALID_TYPES.includes(type)) throw new AppError(400, 'Invalid type');

  const submission = await feedbackService.create({
    organizationId: req.organization!.id,
    contactId: contactId || undefined,
    name: name.trim(),
    email: email?.trim() || undefined,
    type: type || 'feedback',
    subject: subject.trim(),
    message: message.trim(),
  });

  res.status(201).json({ status: 'success', data: { submission } });
});

export const getFeedback = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const result = await feedbackService.list(req.organization!.id, {
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  });

  res.status(200).json({ status: 'success', data: result });
});

export const getFeedbackById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const submission = await feedbackService.getById(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { submission } });
});

export const updateFeedbackStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) throw new AppError(400, 'Invalid status');
  const submission = await feedbackService.updateStatus(req.params.id, req.organization!.id, status);
  res.status(200).json({ status: 'success', data: { submission } });
});
