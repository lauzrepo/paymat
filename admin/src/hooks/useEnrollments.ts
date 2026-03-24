import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/enrollments';

export function useEnrollments(params?: { page?: number; status?: string; contactId?: string; programId?: string }) {
  return useQuery({
    queryKey: ['enrollments', params],
    queryFn: () => api.getEnrollments(params),
  });
}

export function useEnroll() {
  return useMutation({
    mutationFn: api.enroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUnenroll() {
  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate?: string }) => api.unenroll(id, endDate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export function usePauseEnrollment() {
  return useMutation({
    mutationFn: api.pauseEnrollment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export function useResumeEnrollment() {
  return useMutation({
    mutationFn: api.resumeEnrollment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}
