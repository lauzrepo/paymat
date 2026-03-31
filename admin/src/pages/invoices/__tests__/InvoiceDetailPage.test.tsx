import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { InvoiceDetailPage } from '../InvoiceDetailPage';

vi.mock('../../../hooks/useInvoices', () => ({
  useInvoice: vi.fn(),
  useVoidInvoice: vi.fn(),
}));

vi.mock('../../../hooks/usePayments', () => ({
  usePayments: vi.fn(),
  useProcessPayment: vi.fn(),
  useRefundPayment: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenantBranding: vi.fn(),
}));

vi.mock('../../../components/InvoiceDownloadButton', () => ({
  InvoiceDownloadButton: () => <button>Download PDF</button>,
}));

vi.mock('../../../lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'inv-1' }) };
});

import { useInvoice, useVoidInvoice } from '../../../hooks/useInvoices';
import { usePayments, useProcessPayment, useRefundPayment } from '../../../hooks/usePayments';
import { useTenantBranding } from '../../../hooks/useTenant';

const INVOICE = {
  id: 'inv-1',
  invoiceNumber: 'INV-001',
  status: 'sent',
  amountDue: 120,
  amountPaid: 0,
  dueDate: '2024-02-01T00:00:00.000Z',
  paidAt: null,
  notes: null,
  createdAt: '2024-01-15T00:00:00.000Z',
  contact: { id: 'c-1', firstName: 'Jane', lastName: 'Doe' },
  family: null,
  lineItems: [
    { id: 'li-1', description: 'Beginner Karate - Jan', quantity: 1, unitPrice: 120, total: 120 },
  ],
};

beforeEach(() => {
  (useInvoice as Mock).mockReturnValue(mockQuery(INVOICE));
  (useVoidInvoice as Mock).mockReturnValue(mockMutation());
  (usePayments as Mock).mockReturnValue(mockQuery({ items: [] }));
  (useProcessPayment as Mock).mockReturnValue(mockMutation());
  (useRefundPayment as Mock).mockReturnValue(mockMutation());
  (useTenantBranding as Mock).mockReturnValue(mockQuery({ name: 'Test Org' }));
});

describe('InvoiceDetailPage', () => {
  it('shows spinner while loading', () => {
    (useInvoice as Mock).mockReturnValue(mockQuery(undefined, { isLoading: true }));
    const { container } = renderWithProviders(<InvoiceDetailPage />);
    expect(container.querySelector('svg') ?? container.querySelector('[class*="animate"]')).toBeTruthy();
  });

  it('shows not found when invoice is null', () => {
    (useInvoice as Mock).mockReturnValue(mockQuery(null));
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByText(/invoice not found/i)).toBeInTheDocument();
  });

  it('renders the invoice number as heading', () => {
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  it('renders the invoice status badge', () => {
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByText('sent')).toBeInTheDocument();
  });

  it('renders amount due, paid, and balance', () => {
    renderWithProviders(<InvoiceDetailPage />);
    // amountDue = 120, amountPaid = 0, balance = 120
    // formatted: $120.00 appears multiple times (amount due, balance, line item total)
    const amounts = screen.getAllByText('$120.00');
    expect(amounts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('renders line items table', () => {
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByText('Beginner Karate - Jan')).toBeInTheDocument();
  });

  it('renders bill-to contact link', () => {
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByRole('link', { name: /jane doe/i })).toBeInTheDocument();
  });

  it('shows no payments recorded when payments list is empty', () => {
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByText(/no payments recorded/i)).toBeInTheDocument();
  });

  it('renders payments table when payments exist', () => {
    (usePayments as Mock).mockReturnValue(mockQuery({
      items: [{
        id: 'pay-1',
        amount: 120,
        status: 'succeeded',
        paymentMethodType: 'cash',
        createdAt: '2024-01-20T00:00:00.000Z',
      }],
    }));
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByText('cash')).toBeInTheDocument();
    expect(screen.getByText('succeeded')).toBeInTheDocument();
  });

  it('shows Record payment and Void invoice buttons for actionable invoices', () => {
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /void invoice/i })).toBeInTheDocument();
  });

  it('does not show action buttons for paid invoices', () => {
    (useInvoice as Mock).mockReturnValue(mockQuery({ ...INVOICE, status: 'paid', amountPaid: 120 }));
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /void invoice/i })).not.toBeInTheDocument();
  });

  it('does not show action buttons for voided invoices', () => {
    (useInvoice as Mock).mockReturnValue(mockQuery({ ...INVOICE, status: 'void' }));
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
  });

  it('opens payment form when Record payment is clicked', () => {
    renderWithProviders(<InvoiceDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /record payment/i }));
    expect(screen.getByText('Record Payment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows refund button for succeeded payments', () => {
    (usePayments as Mock).mockReturnValue(mockQuery({
      items: [{
        id: 'pay-1',
        amount: 120,
        status: 'succeeded',
        paymentMethodType: 'cash',
        createdAt: '2024-01-20T00:00:00.000Z',
      }],
    }));
    renderWithProviders(<InvoiceDetailPage />);
    expect(screen.getByRole('button', { name: /refund/i })).toBeInTheDocument();
  });

  it('shows Download PDF button', async () => {
    renderWithProviders(<InvoiceDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });
  });
});
