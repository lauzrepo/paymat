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
