import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/families';

export function useFamilies(params?: { page?: number }) {
  return useQuery({
    queryKey: ['families', params],
    queryFn: () => api.getFamilies(params),
  });
}

export function useFamily(id: string) {
  return useQuery({
    queryKey: ['families', id],
    queryFn: () => api.getFamily(id),
    enabled: !!id,
  });
}

export function useCreateFamily() {
  return useMutation({
    mutationFn: api.createFamily,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['families'] }),
  });
}

export function useUpdateFamily(id: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updateFamily>[1]) => api.updateFamily(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['families'] }),
  });
}

export function useDeleteFamily() {
  return useMutation({
    mutationFn: api.deleteFamily,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['families'] }),
  });
}
