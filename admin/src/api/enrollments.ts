import { apiClient } from '../lib/axios';
import type { Enrollment } from '../types/enrollment';

interface ListResult<T> { items: T[]; total: number; page: number; totalPages: number }

export const getEnrollments = (params?: { page?: number; limit?: number; status?: string; contactId?: string; programId?: string }): Promise<ListResult<Enrollment>> =>
  apiClient.get('/enrollments', { params }).then((r) => ({ items: r.data.data.enrollments, ...r.data.data }));

export const enroll = (body: { contactId: string; programId: string; startDate: string }): Promise<Enrollment> =>
  apiClient.post('/enrollments', body).then((r) => r.data.data.enrollment);

export const unenroll = (id: string, endDate?: string): Promise<Enrollment> =>
  apiClient.delete(`/enrollments/${id}`, { data: { endDate } }).then((r) => r.data.data.enrollment);

export const pauseEnrollment = (id: string): Promise<Enrollment> =>
  apiClient.post(`/enrollments/${id}/pause`).then((r) => r.data.data.enrollment);

export const resumeEnrollment = (id: string): Promise<Enrollment> =>
  apiClient.post(`/enrollments/${id}/resume`).then((r) => r.data.data.enrollment);
