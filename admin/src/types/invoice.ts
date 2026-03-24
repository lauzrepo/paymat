export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  contactId: string | null;
  familyId: string | null;
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems?: InvoiceLineItem[];
  contact?: { id: string; firstName: string; lastName: string } | null;
  family?: { id: string; name: string } | null;
}

export interface InvoiceStats {
  total: number;
  paid: number;
  overdue: number;
  draft: number;
  totalAmountDue: number;
  totalAmountPaid: number;
}
