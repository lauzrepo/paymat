import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getMe,
  getMyEnrollments,
  getMyInvoices,
  getMyInvoice,
  initializeInvoicePayment,
  getMyPayments,
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

