import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTenantBranding } from '../api/tenant';
import {
  getMe,
  getMyEnrollments,
  getMyInvoices,
  getMyInvoice,
  initializeInvoicePayment,
  getMyPayments,
  getAutopayStatus,
  initializeAutopay,
  confirmAutopay,
  removeAutopay,
  getEnrollablePrograms,
  selfEnroll,
  getUpcomingSessions,
  bookSession,
  cancelSessionBooking,
} from '../api/client';

export const useTenantBranding = () =>
  useQuery({ queryKey: ['tenant', 'branding'], queryFn: getTenantBranding, staleTime: 1000 * 60 * 5 });

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

export const useInitializeAutopay = () =>
  useMutation({ mutationFn: initializeAutopay });

export const useConfirmAutopay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (setupIntentId: string) => confirmAutopay(setupIntentId),
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

export const useEnrollablePrograms = () =>
  useQuery({ queryKey: ['client', 'enrollable-programs'], queryFn: getEnrollablePrograms });

export const useSelfEnroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: selfEnroll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'enrollable-programs'] });
      qc.invalidateQueries({ queryKey: ['client', 'enrollments'] });
      qc.invalidateQueries({ queryKey: ['client', 'sessions'] });
      qc.invalidateQueries({ queryKey: ['client', 'invoices'] });
    },
  });
};

export const useUpcomingSessions = () =>
  useQuery({ queryKey: ['client', 'sessions'], queryFn: getUpcomingSessions });

export const useBookSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bookSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', 'sessions'] }),
  });
};

export const useCancelSessionBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelSessionBooking,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', 'sessions'] }),
  });
};

