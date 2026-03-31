import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { InvoicesPage } from '../InvoicesPage';

vi.mock('../../../hooks/useInvoices', () => ({
  useInvoices: vi.fn(),
  useInvoiceStats: vi.fn(),
  useCreateInvoice: vi.fn(),
  useVoidInvoice: vi.fn(),
}));

vi.mock('../../../hooks/usePayments', () => ({
  useProcessPayment: vi.fn(),
}));

vi.mock('../../../hooks/useContacts', () => ({
  useContacts: vi.fn(),
}));

vi.mock('../../../hooks/useEnrollments', () => ({
  useEnrollments: vi.fn(),
}));

import { useInvoices, useInvoiceStats, useCreateInvoice, useVoidInvoice } from '../../../hooks/useInvoices';
import { useProcessPayment } from '../../../hooks/usePayments';
import { useContacts } from '../../../hooks/useContacts';
import { useEnrollments } from '../../../hooks/useEnrollments';

const STATS = { total: 15, paid: 10, overdue: 3, totalAmountDue: 7500, totalAmountPaid: 5000 };

const INVOICES = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-00001',
    amountDue: 150,
    amountPaid: 0,
    status: 'sent',
    dueDate: '2026-04-01T00:00:00.000Z',
    contact: { id: 'c-1', firstName: 'Jane', lastName: 'Doe' },
    family: null,
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-00002',
    amountDue: 120,
    amountPaid: 120,
    status: 'paid',
    dueDate: '2026-03-01T00:00:00.000Z',
    contact: null,
    family: { id: 'fam-1', name: 'Johnson Family' },
  },
];

beforeEach(() => {
  (useInvoices as Mock).mockReturnValue(mockQuery({ items: INVOICES, total: 2 }));
  (useInvoiceStats as Mock).mockReturnValue(mockQuery(STATS));
  (useCreateInvoice as Mock).mockReturnValue(mockMutation());
  (useVoidInvoice as Mock).mockReturnValue(mockMutation());
  (useProcessPayment as Mock).mockReturnValue(mockMutation());
  (useContacts as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
  (useEnrollments as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
});

describe('InvoicesPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
  });

  it('shows a Create Invoice button', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument();
  });

  it('renders stat cards with data', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByText('15')).toBeInTheDocument(); // total
    expect(screen.getByText('10')).toBeInTheDocument(); // paid
    expect(screen.getByText('3')).toBeInTheDocument();  // overdue
  });

  it('renders invoice numbers in the table', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByText('INV-00001')).toBeInTheDocument();
    expect(screen.getByText('INV-00002')).toBeInTheDocument();
  });

  it('shows contact name for contact-billed invoices', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows family name for family-billed invoices', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByText('Johnson Family')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByText('sent')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (useInvoices as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<InvoicesPage />);
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('shows empty state when there are no invoices', () => {
    (useInvoices as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByText(/no invoices found/i)).toBeInTheDocument();
  });

  it('has a status filter dropdown', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument();
  });

  it('opens create invoice form when button is clicked', () => {
    renderWithProviders(<InvoicesPage />);
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));
    expect(screen.getByText(/new invoice/i)).toBeInTheDocument();
  });

  it('closes the create form when Cancel is clicked', () => {
    renderWithProviders(<InvoicesPage />);
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/new invoice/i)).not.toBeInTheDocument();
  });

  it('shows amount formatted as currency', () => {
    renderWithProviders(<InvoicesPage />);
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });
});
