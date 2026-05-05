import { Request, Response } from 'express';
import contactService from '../services/contactService';
import stripeConnectService from '../services/stripeConnectService';
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
  const contact = await contactService.getContactById(req.params.id as string, req.organization!.id);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const contact = await contactService.updateContact(req.params.id as string, req.organization!.id, req.body);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const deactivateContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const contact = await contactService.deactivateContact(req.params.id as string, req.organization!.id);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const initializeCardCheckout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const contact = await contactService.getContactById(req.params.id as string, req.organization!.id);

  const org = await prisma.organization.findUnique({
    where: { id: req.organization!.id },
    select: { stripeConnectAccountId: true, sandboxMode: true },
  });
  if (!org?.stripeConnectAccountId) throw new AppError(503, 'Payment processing not configured for this organization');

  const { sandboxMode } = org;

  let stripeCustomerId = (contact as { stripeCustomerId?: string | null }).stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    stripeCustomerId = await stripeConnectService.createCustomer(
      org.stripeConnectAccountId,
      contact.email ?? `${contact.firstName} ${contact.lastName}`,
      `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim(),
      sandboxMode
    );
    await prisma.contact.update({ where: { id: req.params.id as string }, data: { stripeCustomerId } });
  }

  const clientSecret = await stripeConnectService.createSetupIntent(org.stripeConnectAccountId, stripeCustomerId, sandboxMode);

  res.status(200).json({
    status: 'success',
    data: { clientSecret, connectAccountId: org.stripeConnectAccountId, publishableKey: stripeConnectService.getPublishableKey(sandboxMode), customerId: stripeCustomerId },
  });
});

export const saveCardToken = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { stripeCustomerId, stripeDefaultPaymentMethodId } = req.body;
  if (!stripeCustomerId) throw new AppError(400, 'stripeCustomerId is required');
  if (!stripeDefaultPaymentMethodId) throw new AppError(400, 'stripeDefaultPaymentMethodId is required');
  await contactService.getContactById(req.params.id as string, req.organization!.id);
  const contact = await prisma.contact.update({
    where: { id: req.params.id as string },
    data: { stripeCustomerId, stripeDefaultPaymentMethodId },
  });
  res.status(200).json({ status: 'success', data: { contact } });
});

export const reactivateContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const contact = await contactService.reactivateContact(req.params.id as string, req.organization!.id);
  res.status(200).json({ status: 'success', data: { contact } });
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  await contactService.deleteContact(req.params.id as string, req.organization!.id);
  res.status(204).send();
});

export const bulkImportContacts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) throw new AppError(400, 'contacts array is required and must not be empty');
  if (contacts.length > 500) throw new AppError(400, 'Maximum 500 contacts per import');
  const results = await contactService.bulkImportContacts(req.organization!.id, contacts);
  res.status(200).json({ status: 'success', data: { results } });
});
