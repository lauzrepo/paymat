import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/contacts';

export function useContacts(params?: { page?: number; search?: string; status?: string; familyId?: string }) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => api.getContacts(params),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => api.getContact(id),
    enabled: !!id,
  });
}

export function useCreateContact() {
  return useMutation({
    mutationFn: api.createContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact(id: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updateContact>[1]) => api.updateContact(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', id] });
    },
  });
}

export function useDeactivateContact() {
  return useMutation({
    mutationFn: api.deactivateContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });
}
