import { AppError } from '../middleware/errorHandler';

export const INDUSTRIES = [
  'dance',
  'martial_arts',
  'music',
  'swim',
  'gymnastics',
  'personal_training',
  'other',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const isIndustry = (value: unknown): value is Industry =>
  typeof value === 'string' && (INDUSTRIES as readonly string[]).includes(value);

/**
 * Validates an optional industry from a request body.
 * Returns undefined when omitted, null when explicitly cleared, otherwise the valid value.
 */
export const parseIndustry = (value: unknown): Industry | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (!isIndustry(value)) throw new AppError(400, `industry must be one of: ${INDUSTRIES.join(', ')}`);
  return value;
};
