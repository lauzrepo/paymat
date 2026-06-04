import { apiClient } from '../lib/axios';

export interface ClassSession {
  id: string;
  organizationId: string;
  programId: string;
  recurrenceSeriesId: string | null;
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  capacity: number | null;
  status: string;
  notes: string | null;
  _count?: { bookings: number };
}

export interface SessionBooking {
  id: string;
  enrollmentId: string;
  status: string;
  bookedAt: string;
  enrollment: {
    contact: { id: string; firstName: string; lastName: string; email: string | null };
  };
}

export interface SessionDetail extends ClassSession {
  bookings: SessionBooking[];
}

export interface RecurrenceSeries {
  id: string;
  programId: string;
  daysOfWeek: string[];
  timeOfDay: string;
  durationMinutes: number;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  seriesStartDate: string;
  seriesEndDate: string | null;
}

export const getSessions = (programId: string, from: Date, to: Date): Promise<ClassSession[]> =>
  apiClient
    .get('/sessions', {
      params: {
        programId,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    })
    .then((r) => r.data.data);

export const getSession = (id: string): Promise<SessionDetail> =>
  apiClient.get(`/sessions/${id}`).then((r) => r.data.data);

export const createSession = (data: {
  programId: string;
  startsAt: string;
  durationMinutes: number;
  location?: string;
  capacity?: number;
  notes?: string;
}): Promise<ClassSession> =>
  apiClient.post('/sessions', data).then((r) => r.data.data);

export const createSeries = (data: {
  programId: string;
  daysOfWeek: string[];
  timeOfDay: string;
  durationMinutes: number;
  location?: string;
  capacity?: number;
  notes?: string;
  seriesStartDate: string;
  seriesEndDate?: string;
}): Promise<RecurrenceSeries> =>
  apiClient.post('/sessions/series', data).then((r) => r.data.data);

export const updateSession = (
  id: string,
  data: Partial<Pick<ClassSession, 'startsAt' | 'durationMinutes' | 'location' | 'capacity' | 'notes'>>,
  scope: 'one' | 'future',
): Promise<ClassSession> =>
  apiClient.put(`/sessions/${id}`, data, { params: { scope } }).then((r) => r.data.data);

export const cancelSession = (id: string, scope: 'one' | 'future'): Promise<void> =>
  apiClient.delete(`/sessions/${id}`, { params: { scope } }).then(() => undefined);

export const cancelBooking = (sessionId: string, bookingId: string): Promise<void> =>
  apiClient.delete(`/sessions/${sessionId}/bookings/${bookingId}`).then(() => undefined);
