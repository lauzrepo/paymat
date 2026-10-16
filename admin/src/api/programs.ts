import { apiClient } from '../lib/axios';
import type { Program } from '../types/program';

interface ListResult<T> { items: T[]; total: number; page: number; totalPages: number }

export const getPrograms = (params?: { page?: number; limit?: number; activeOnly?: boolean }): Promise<ListResult<Program>> =>
  apiClient.get('/programs', { params }).then((r) => ({ items: r.data.data.programs, ...r.data.data }));

export const getProgram = (id: string): Promise<Program> =>
  apiClient.get(`/programs/${id}`).then((r) => r.data.data.program);

export const createProgram = (body: Partial<Program>): Promise<Program> =>
  apiClient.post('/programs', body).then((r) => r.data.data.program);

export const updateProgram = (id: string, body: Partial<Program>): Promise<Program> =>
  apiClient.put(`/programs/${id}`, body).then((r) => r.data.data.program);

export const deleteProgram = (id: string): Promise<void> =>
  apiClient.delete(`/programs/${id}`).then(() => undefined);

// ── Templates ────────────────────────────────────────────────────────────────

export interface TemplateProgram {
  key: string;
  name: string;
  description: string;
  billingFrequency: 'monthly' | 'weekly' | 'yearly' | 'one_time';
  suggestedPrice: number;
  priceRange: [number, number];
  maxClasses?: number;
  maxBillingCycles?: number;
  kind: 'recurring' | 'pack' | 'fee';
  defaultSelected: boolean;
}

export interface IndustryTemplate {
  industry: string;
  label: string;
  programs: TemplateProgram[];
}

export interface ProgramTemplates {
  industry: string | null;
  templates: IndustryTemplate[];
}

export interface ApplyTemplateBody {
  industry: string;
  programs: { key: string; price?: number; name?: string }[];
}

export interface ApplyTemplateResult {
  created: Program[];
  skipped: { key: string; name: string; reason: string }[];
  classBookingOff: boolean;
}

export const getProgramTemplates = (): Promise<ProgramTemplates> =>
  apiClient.get('/programs/templates').then((r) => r.data.data);

export const applyProgramTemplate = (body: ApplyTemplateBody): Promise<ApplyTemplateResult> =>
  apiClient.post('/programs/templates/apply', body).then((r) => r.data.data);
