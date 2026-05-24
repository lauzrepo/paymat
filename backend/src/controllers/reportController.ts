import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import reportService from '../services/reportService';
import { sendMonthlyStatement, sendAnnualSummary } from '../services/emailService';

function parseYear(s: string | string[]): number {
  const n = parseInt(Array.isArray(s) ? s[0] : s);
  if (isNaN(n)) throw new AppError(400, 'Invalid year');
  return n;
}

function parseMonth(s: string | string[]): number {
  const n = parseInt(Array.isArray(s) ? s[0] : s);
  if (isNaN(n) || n < 1 || n > 12) throw new AppError(400, 'Invalid month');
  return n;
}

export const getMonthlyStatement = asyncHandler(async (req: Request, res: Response) => {
  const y = parseYear(req.params.year);
  const m = parseMonth(req.params.month);
  const stmt = await reportService.getMonthlyStatement(req.organization!.id, y, m);
  res.json({ status: 'success', data: { statement: stmt } });
});

export const downloadMonthlyStatement = asyncHandler(async (req: Request, res: Response) => {
  const y = parseYear(req.params.year);
  const m = parseMonth(req.params.month);
  const stmt = await reportService.getMonthlyStatement(req.organization!.id, y, m);
  const csv = reportService.generateMonthlyCsv(stmt);
  const filename = `statement-${stmt.orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '_')}-${y}-${String(m).padStart(2, '0')}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export const emailMonthlyStatement = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError(400, 'Email address required');
  const y = parseYear(req.params.year);
  const m = parseMonth(req.params.month);
  const stmt = await reportService.getMonthlyStatement(req.organization!.id, y, m);
  await sendMonthlyStatement(email, stmt);
  res.json({ status: 'success', message: `Statement emailed to ${email}` });
});

export const getAnnualSummary = asyncHandler(async (req: Request, res: Response) => {
  const y = parseYear(req.params.year);
  const summary = await reportService.getAnnualSummary(req.organization!.id, y);
  res.json({ status: 'success', data: { summary } });
});

export const downloadAnnualSummary = asyncHandler(async (req: Request, res: Response) => {
  const y = parseYear(req.params.year);
  const summary = await reportService.getAnnualSummary(req.organization!.id, y);
  const csv = reportService.generateAnnualCsv(summary);
  const filename = `revenue-summary-${summary.orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '_')}-${y}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export const emailAnnualSummary = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError(400, 'Email address required');
  const y = parseYear(req.params.year);
  const summary = await reportService.getAnnualSummary(req.organization!.id, y);
  await sendAnnualSummary(email, summary);
  res.json({ status: 'success', message: `Annual summary emailed to ${email}` });
});
