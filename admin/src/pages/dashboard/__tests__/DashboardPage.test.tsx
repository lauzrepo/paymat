import { screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery } from '../../../test/renderWithProviders';
import { DashboardPage } from '../DashboardPage';

vi.mock('../../../hooks/useInvoices', () => ({
  useInvoiceStats: vi.fn(),
  useInvoices: vi.fn(),
}));

vi.mock('../../../hooks/usePayments', () => ({
  usePaymentStats: vi.fn(),
}));

vi.mock('../../../hooks/useContacts', () => ({
  useContacts: vi.fn(),
}));

import { useInvoiceStats, useInvoices } from '../../../hooks/useInvoices';
import { usePaymentStats } from '../../../hooks/usePayments';
import { useContacts } from '../../../hooks/useContacts';

const INVOICE_STATS = { total: 10, paid: 6, overdue: 2, draft: 1, totalAmountDue: 5000, totalAmountPaid: 3200 };
const PAYMENT_STATS = { totalAmount: 2400, count: 12 };
const CONTACTS_DATA = { items: [], total: 42 };

const OVERDUE_INVOICES = {
  items: [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-00001',
      amountDue: 120,
      amountPaid: 0,
      dueDate: '2026-02-01T00:00:00.000Z',
      status: 'overdue',
      contact: { id: 'c-1', firstName: 'Jane', lastName: 'Doe' },
      family: null,
    },
  ],
  total: 1,
};

beforeEach(() => {
  (useInvoiceStats as Mock).mockReturnValue(mockQuery(INVOICE_STATS));
  (usePaymentStats as Mock).mockReturnValue(mockQuery(PAYMENT_STATS));
  (useContacts as Mock).mockReturnValue(mockQuery(CONTACTS_DATA));
  (useInvoices as Mock).mockReturnValue(mockQuery(OVERDUE_INVOICES));
});

describe('DashboardPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows active member count from contacts data', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows overdue invoice count from invoice stats', () => {
    renderWithProviders(<DashboardPage />);
    // Both the StatCard and Invoice Summary show overdue count
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it('displays revenue formatted as currency from payment stats', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('$2,400.00')).toBeInTheDocument();
  });

  it('shows invoice summary breakdown (draft, paid, overdue, total)', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // total invoices
  });

  it('renders the overdue invoices table with data', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('INV-00001')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
  });

  it('shows empty state when there are no overdue invoices', () => {
    (useInvoices as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('No overdue invoices.')).toBeInTheDocument();
  });

  it('shows a spinner while overdue invoices are loading', () => {
    (useInvoices as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<DashboardPage />);
    // Spinner renders an SVG or a role="status" element
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('shows "—" placeholders while stats are loading', () => {
    (useInvoiceStats as Mock).mockReturnValue({ data: undefined, isLoading: true });
    (usePaymentStats as Mock).mockReturnValue({ data: undefined, isLoading: true });
    (useContacts as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<DashboardPage />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
