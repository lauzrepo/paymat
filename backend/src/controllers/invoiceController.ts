import { Request, Response } from 'express';
import invoiceService from '../services/invoiceService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import prisma from '../config/database';

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const { contactId, familyId, dueDate, notes, lineItems } = req.body;
  const invoice = await invoiceService.createInvoice({
    organizationId: req.organization!.id,
    contactId,
    familyId,
    dueDate: new Date(dueDate),
    notes,
    lineItems,
  });
  res.status(201).json({ status: 'success', data: { invoice } });
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await invoiceService.getInvoices(req.organization!.id, page, limit, {
    status: req.query.status as string | undefined,
    contactId: req.query.contactId as string | undefined,
    familyId: req.query.familyId as string | undefined,
  });
  res.status(200).json({ status: 'success', data: result });
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const invoice = await invoiceService.getInvoiceById(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { invoice } });
});

export const markInvoicePaid = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const invoice = await invoiceService.markAsPaid(req.params.id, req.organization!.id);

  await prisma.auditLog.create({
    data: {
      organizationId: req.organization!.id,
      userId: req.user.userId,
      action: 'INVOICE_MARKED_PAID',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { invoiceId: req.params.id },
    },
  });

  res.status(200).json({ status: 'success', data: { invoice } });
});

export const voidInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const invoice = await invoiceService.voidInvoice(req.params.id, req.organization!.id);
  res.status(200).json({ status: 'success', data: { invoice } });
});

export const getInvoiceStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const stats = await invoiceService.getStats(req.organization!.id);
  res.status(200).json({ status: 'success', data: { stats } });
});
