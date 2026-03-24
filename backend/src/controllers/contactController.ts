import { Request, Response } from 'express';
import contactService from '../services/contactService';
import helcimService from '../services/helcimService';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const createContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { firstName, lastName, email, phone, familyId, dateOfBirth, notes } = req.body;
  const contact = await contactService.createContact({
    organizationId: req.organization!.id,
    firstName,
    lastName,
    email,
    phone,
    familyId,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    notes,
  });
  res.status(201).json({ status: 'success', data: { contact } });
});

export const getContacts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await contactService.getContacts(req.organization!.id, page, limit, {
    status: req.query.status as string | undefined,
    familyId: req.query.familyId as string | undefined,
    search: req.query.search as string | undefined,
  });
  res.status(200).json({ status: 'success', data: result });
});

export const getContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const contact = await contactService.getContactById(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const contact = await contactService.updateContact(req.params.id, req.organization!.id, req.body);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const deactivateContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const contact = await contactService.deactivateContact(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const initializeCardCheckout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  // Verify contact belongs to org
  await contactService.getContactById(req.params.id, req.organization!.id);
  const checkout = await helcimService.initializeCheckout(0, 'USD');
  res.status(200).json({ status: 'success', data: checkout });
});

export const saveCardToken = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { cardToken } = req.body;
  if (!cardToken) throw new AppError(400, 'cardToken is required');
  await contactService.getContactById(req.params.id, req.organization!.id);
  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: { helcimToken: cardToken },
  });
  res.status(200).json({ status: 'success', data: { contact } });
});

export const reactivateContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const contact = await contactService.reactivateContact(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  await contactService.deleteContact(req.params.id, req.organization!.id);
  res.status(204).send();
});
