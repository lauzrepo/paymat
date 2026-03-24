import { apiClient } from '../lib/axios';
import type { Invoice, InvoiceStats } from '../types/invoice';

interface ListResult<T> { items: T[]; total: number; page: number; totalPages: number }

export const getInvoices = (params?: { page?: number; limit?: number; status?: string; contactId?: string; familyId?: string }): Promise<ListResult<Invoice>> =>
  apiClient.get('/invoices', { params }).then((r) => ({ items: r.data.data.invoices, ...r.data.data }));

export const getInvoice = (id: string): Promise<Invoice> =>
  apiClient.get(`/invoices/${id}`).then((r) => r.data.data.invoice);

export const getInvoiceStats = (): Promise<InvoiceStats> =>
  apiClient.get('/invoices/stats').then((r) => r.data.data.stats);

export const createInvoice = (body: {
  contactId?: string;
  familyId?: string;
  dueDate: string;
  notes?: string;
  lineItems: { description: string; quantity?: number; unitPrice: number }[];
}): Promise<Invoice> =>
  apiClient.post('/invoices', body).then((r) => r.data.data.invoice);

export const markInvoicePaid = (id: string): Promise<Invoice> =>
  apiClient.post(`/invoices/${id}/mark-paid`).then((r) => r.data.data.invoice);

export const voidInvoice = (id: string): Promise<Invoice> =>
  apiClient.post(`/invoices/${id}/void`).then((r) => r.data.data.invoice);
