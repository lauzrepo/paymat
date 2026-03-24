export type PaymentStatus = 'completed' | 'failed' | 'pending' | 'refunded';

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethodType: string;
  notes: string | null;
  createdAt: string;
  invoice?: { id: string; invoiceNumber: string } | null;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
}

export interface PaymentStats {
  total: number;
  succeeded: number;
  totalAmount: number;
}
