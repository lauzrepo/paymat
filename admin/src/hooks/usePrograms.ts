import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/programs';

export function usePrograms(params?: { page?: number; activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['programs', params],
    queryFn: () => api.getPrograms(params),
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: ['programs', id],
    queryFn: () => api.getProgram(id),
    enabled: !!id,
  });
}

export function useCreateProgram() {
  return useMutation({
    mutationFn: api.createProgram,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] }),
  });
}

export function useUpdateProgram(id: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updateProgram>[1]) => api.updateProgram(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] }),
  });
}

export function useDeleteProgram() {
  return useMutation({
    mutationFn: api.deleteProgram,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] }),
  });
}
