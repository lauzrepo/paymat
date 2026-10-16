import { Request, Response } from 'express';
import programService from '../services/programService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import prisma from '../config/database';
import programTemplateService, { TemplateSelection } from '../services/programTemplateService';
import { isIndustry } from '../config/industries';

const positiveIntOrNull = (value: unknown, field: string): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new AppError(400, `${field} must be a positive whole number`);
  }
  return value;
};

const parseProgramOptions = (body: Record<string, unknown>) => {
  if (body.allowSelfEnrollment !== undefined && typeof body.allowSelfEnrollment !== 'boolean') {
    throw new AppError(400, 'allowSelfEnrollment must be a boolean');
  }
  return {
    maxClasses: positiveIntOrNull(body.maxClasses, 'maxClasses'),
    maxBillingCycles: positiveIntOrNull(body.maxBillingCycles, 'maxBillingCycles'),
    allowSelfEnrollment: body.allowSelfEnrollment as boolean | undefined,
  };
};

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
    ...parseProgramOptions(req.body),
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
  const program = await programService.getProgramById(req.params.id as string, req.organization!.id);
  res.status(200).json({ status: 'success', data: { program } });
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const program = await programService.updateProgram(req.params.id as string, req.organization!.id, {
    ...req.body,
    ...parseProgramOptions(req.body),
  });
  res.status(200).json({ status: 'success', data: { program } });
});

export const deleteProgram = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const count = await prisma.enrollment.count({
    where: { programId: req.params.id as string, status: 'active' },
  });
  if (count > 0) throw new AppError(400, 'Cannot delete a program with active enrollments. Deactivate it instead.');
  await prisma.program.deleteMany({
    where: { id: req.params.id as string, organizationId: req.organization!.id },
  });
  res.status(200).json({ status: 'success', data: {} });
});

// GET /api/programs/templates — starter programs for the org's industry (or all industries if unset)
export const getProgramTemplates = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const data = programTemplateService.getTemplates(req.organization!.industry);
  res.status(200).json({ status: 'success', data });
});

const parseSelections = (value: unknown): TemplateSelection[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, 'programs must be a non-empty array');
  }
  return value.map((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    if (typeof item.key !== 'string' || !item.key) throw new AppError(400, `programs[${i}].key is required`);

    const selection: TemplateSelection = { key: item.key };

    if (item.price !== undefined) {
      if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price <= 0) {
        throw new AppError(400, `programs[${i}].price must be a number greater than 0`);
      }
      selection.price = item.price;
    }
    if (item.name !== undefined) {
      if (typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 100) {
        throw new AppError(400, `programs[${i}].name must be 1-100 characters`);
      }
      selection.name = item.name.trim();
    }
    if (item.description !== undefined) {
      if (typeof item.description !== 'string' || item.description.length > 500) {
        throw new AppError(400, `programs[${i}].description must be at most 500 characters`);
      }
      selection.description = item.description;
    }
    return selection;
  });
};

// POST /api/programs/templates/apply — create the chosen template programs (inactive drafts)
export const applyProgramTemplate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const { industry } = req.body ?? {};
  if (!isIndustry(industry)) throw new AppError(400, 'A valid industry is required');

  const result = await programTemplateService.applyTemplate({
    organization: req.organization!,
    userId: req.user.userId,
    industry,
    selections: parseSelections(req.body.programs),
  });

  res.status(201).json({ status: 'success', data: result });
});
