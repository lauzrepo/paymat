import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/sessions';

export function useSessions(programId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['sessions', programId, from.toISOString(), to.toISOString()],
    queryFn: () => api.getSessions(programId, from, to),
    enabled: !!programId,
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });
}

export function useCreateSession(programId: string) {
  return useMutation({
    mutationFn: api.createSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', programId] }),
  });
}

export function useCreateSeries(programId: string) {
  return useMutation({
    mutationFn: api.createSeries,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', programId] }),
  });
}

export function useUpdateSession(programId: string) {
  return useMutation({
    mutationFn: ({ id, data, scope }: { id: string; data: Parameters<typeof api.updateSession>[1]; scope: 'one' | 'future' }) =>
      api.updateSession(id, data, scope),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', programId] }),
  });
}

export function useCancelSession(programId: string) {
  return useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: 'one' | 'future' }) =>
      api.cancelSession(id, scope),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', programId] }),
  });
}

export function useCancelBooking(sessionId: string) {
  return useMutation({
    mutationFn: (bookingId: string) => api.cancelBooking(sessionId, bookingId),
    onSuccess: () => {
      // Invalidate all 'sessions' queries: clears both the detail view (booking
      // roster) and all calendar list views (_count.bookings on each session).
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
