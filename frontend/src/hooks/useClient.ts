import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  getMyEnrollments,
  getMyInvoices,
  getMyInvoice,
  initializeInvoicePayment,
  getMyPayments,
  getAutopayStatus,
  setupAutopay,
  saveAutopay,
  removeAutopay,
} from '../api/client';

export const useClientMe = () =>
  useQuery({ queryKey: ['client', 'me'], queryFn: getMe });

export const useMyEnrollments = () =>
  useQuery({ queryKey: ['client', 'enrollments'], queryFn: getMyEnrollments });

export const useMyInvoices = (page = 1) =>
  useQuery({ queryKey: ['client', 'invoices', page], queryFn: () => getMyInvoices(page) });

export const useMyInvoice = (id: string) =>
  useQuery({ queryKey: ['client', 'invoices', id], queryFn: () => getMyInvoice(id), enabled: !!id });

export const useInitializeInvoicePayment = () =>
  useMutation({ mutationFn: (id: string) => initializeInvoicePayment(id) });

export const useMyPayments = (page = 1) =>
  useQuery({ queryKey: ['client', 'payments', page], queryFn: () => getMyPayments(page) });

export const useAutopayStatus = () =>
  useQuery({ queryKey: ['client', 'autopay'], queryFn: getAutopayStatus });

export const useSetupAutopay = () =>
  useMutation({ mutationFn: setupAutopay });

export const useSaveAutopay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveAutopay,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', 'autopay'] }),
  });
};

export const useRemoveAutopay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeAutopay,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', 'autopay'] }),
  });
};

