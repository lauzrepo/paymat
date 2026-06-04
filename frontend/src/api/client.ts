import { apiClient } from '../lib/api';

export interface Program {
  id: string;
  name: string;
  description: string | null;
  price: string;
  billingFrequency: string;
}

export interface Enrollment {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string | null;
  program: Program;
}

export interface Family {
  id: string;
  name: string;
  billingEmail: string | null;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  status: string;
  family: Family | null;
  enrollments: Enrollment[];
}

export interface ClientUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  contact: Contact | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethodType: string;
  createdAt: string;
  invoice?: { invoiceNumber: string; amountDue: string };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amountDue: string;
  amountPaid: string;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
}

export const getMe = () =>
  apiClient.get('/client/me').then((r) => r.data.data.user as ClientUser);

export const getMyEnrollments = () =>
  apiClient.get('/client/enrollments').then((r) => r.data.data.enrollments as Enrollment[]);

export const getMyInvoices = (page = 1) =>
  apiClient.get('/client/invoices', { params: { page } }).then(
    (r) => r.data.data as { invoices: Invoice[]; total: number; page: number }
  );

export const getMyInvoice = (id: string) =>
  apiClient.get(`/client/invoices/${id}`).then((r) => r.data.data.invoice as Invoice);

export interface PaymentInitData {
  clientSecret: string;
  paymentIntentId: string;
  connectAccountId: string;
  publishableKey: string;
  amountCents: number;
  currency: string;
}

export const initializeInvoicePayment = (id: string) =>
  apiClient.post(`/client/invoices/${id}/initialize-payment`).then(
    (r) => r.data.data as PaymentInitData
  );

export const confirmInvoicePayment = (invoiceId: string, paymentIntentId: string) =>
  apiClient.post(`/client/invoices/${invoiceId}/confirm-payment`, { paymentIntentId }).then(
    (r) => r.data.data.invoice as Invoice
  );

export const getMyPayments = (page = 1) =>
  apiClient.get('/client/payments', { params: { page } }).then(
    (r) => r.data.data as { payments: Payment[]; total: number; page: number }
  );

export interface AutopayCard {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface AutopayStatus {
  enabled: boolean;
  card: AutopayCard | null;
}

export interface AutopayInitData {
  clientSecret: string;
  connectAccountId: string;
  publishableKey: string;
}

export const getAutopayStatus = () =>
  apiClient.get('/client/autopay').then((r) => r.data.data as AutopayStatus);

export const initializeAutopay = () =>
  apiClient.post('/client/autopay/initialize').then((r) => r.data.data as AutopayInitData);

export const confirmAutopay = (setupIntentId: string) =>
  apiClient.post('/client/autopay/confirm', { setupIntentId }).then((r) => r.data.data);

export const removeAutopay = () =>
  apiClient.delete('/client/autopay').then((r) => r.data.data);

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface UpcomingSession {
  id: string;
  programId: string;
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  capacity: number | null;
  status: string;
  notes: string | null;
  _count: { bookings: number };
  enrollment: { id: string; creditsLeft: number | null };
  myBooking: { id: string; enrollmentId: string } | null;
}

export const getUpcomingSessions = () =>
  apiClient.get('/client/sessions/upcoming').then((r) => r.data.data as UpcomingSession[]);

export const bookSession = (sessionId: string) =>
  apiClient.post(`/client/sessions/${sessionId}/book`).then((r) => r.data.data);

export const cancelSessionBooking = (sessionId: string) =>
  apiClient.delete(`/client/sessions/${sessionId}/book`).then((r) => r.data.data);

