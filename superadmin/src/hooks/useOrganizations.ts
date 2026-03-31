import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/organizations';

export function useOrganizations(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ['organizations', params],
    queryFn: () => api.getOrganizations(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: () => api.getOrganization(id),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: api.createOrganization,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useUpdateOrganization(id: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updateOrganization>[1]) =>
      api.updateOrganization(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useSetOrganizationActive() {
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.setOrganizationActive(id, active),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useDeleteOrganization() {
  return useMutation({
    mutationFn: api.deleteOrganization,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}
