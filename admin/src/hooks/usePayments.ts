import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/payments';

export function usePayments(params?: { page?: number; status?: string; invoiceId?: string }) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => api.getPayments(params),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ['paymentStats'],
    queryFn: api.getPaymentStats,
  });
}

export function useProcessPayment() {
  return useMutation({
    mutationFn: api.processPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRefundPayment() {
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount?: number; reason?: string }) =>
      api.refundPayment(id, amount, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
}
