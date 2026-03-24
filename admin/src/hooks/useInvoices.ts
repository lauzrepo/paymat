import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/invoices';

export function useInvoices(params?: { page?: number; status?: string; contactId?: string; familyId?: string }) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => api.getInvoices(params),
    placeholderData: keepPreviousData,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.getInvoice(id),
    enabled: !!id,
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ['invoiceStats'],
    queryFn: api.getInvoiceStats,
  });
}

export function useCreateInvoice() {
  return useMutation({
    mutationFn: api.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceStats'] });
    },
  });
}

export function useMarkInvoicePaid() {
  return useMutation({
    mutationFn: api.markInvoicePaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceStats'] });
    },
  });
}

export function useVoidInvoice() {
  return useMutation({
    mutationFn: api.voidInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });
}
