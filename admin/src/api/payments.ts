import { apiClient } from '../lib/axios';
import type { Payment, PaymentStats } from '../types/payment';

interface ListResult<T> { items: T[]; total: number; page: number; totalPages: number }

export const getPayments = (params?: { page?: number; limit?: number; status?: string; invoiceId?: string }): Promise<ListResult<Payment>> =>
  apiClient.get('/payments', { params }).then((r) => ({ items: r.data.data.payments, ...r.data.data }));

export const getPaymentStats = (): Promise<PaymentStats> =>
  apiClient.get('/payments/stats').then((r) => r.data.data.stats);

export const getPayment = (id: string): Promise<Payment> =>
  apiClient.get(`/payments/${id}`).then((r) => r.data.data.payment);

export const processPayment = (body: { invoiceId: string; amount: number; currency?: string; cardToken: string; paymentMethodType?: string; notes?: string }): Promise<Payment> =>
  apiClient.post('/payments', body).then((r) => r.data.data.payment);

export const refundPayment = (id: string, amount?: number, reason?: string): Promise<void> =>
  apiClient.post(`/payments/${id}/refund`, { amount, reason }).then(() => undefined);
