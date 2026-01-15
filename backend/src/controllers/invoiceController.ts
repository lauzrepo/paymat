import { Request, Response } from 'express';
import invoiceService from '../services/invoiceService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Get invoices for user
 * GET /api/invoices
 */
export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string | undefined;

  const result = await invoiceService.getInvoices(req.user.userId, page, limit, status);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * Get single invoice
 * GET /api/invoices/:id
 */
export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const invoice = await invoiceService.getInvoiceById(id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { invoice },
  });
});

/**
 * Get invoice PDF URL
 * GET /api/invoices/:id/pdf
 */
export const getInvoicePdf = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const pdfUrl = await invoiceService.getInvoicePdfUrl(id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { pdfUrl },
  });
});

/**
 * Send invoice via email
 * POST /api/invoices/:id/send
 */
export const sendInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  await invoiceService.sendInvoice(id, req.user.userId);

  logger.info(`Invoice sent: ${id} by user ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Invoice sent successfully',
  });
});

/**
 * Get invoice statistics
 * GET /api/invoices/stats
 */
export const getInvoiceStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const stats = await invoiceService.getInvoiceStats(req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});
