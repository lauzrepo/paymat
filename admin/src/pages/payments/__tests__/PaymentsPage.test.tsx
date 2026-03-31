import { screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery } from '../../../test/renderWithProviders';
import { PaymentsPage } from '../PaymentsPage';

vi.mock('../../../hooks/usePayments', () => ({
  usePayments: vi.fn(),
  usePaymentStats: vi.fn(),
}));

import { usePayments, usePaymentStats } from '../../../hooks/usePayments';

const STATS = { total: 30, succeeded: 27, totalAmount: 9800 };

const PAYMENTS = [
  {
    id: 'pay-1',
    amount: 150,
    currency: 'USD',
    paymentMethodType: 'card',
    status: 'succeeded',
    createdAt: '2026-03-10T00:00:00.000Z',
    invoice: { invoiceNumber: 'INV-00001' },
  },
  {
    id: 'pay-2',
    amount: 120,
    currency: 'USD',
    paymentMethodType: 'cash',
    status: 'refunded',
    createdAt: '2026-03-12T00:00:00.000Z',
    invoice: { invoiceNumber: 'INV-00002' },
  },
];

beforeEach(() => {
  (usePayments as Mock).mockReturnValue(mockQuery({ items: PAYMENTS, total: 2 }));
  (usePaymentStats as Mock).mockReturnValue(mockQuery(STATS));
});

describe('PaymentsPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
  });

  it('renders stat cards with data', () => {
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByText('30')).toBeInTheDocument();  // total
    expect(screen.getByText('27')).toBeInTheDocument();  // succeeded
    expect(screen.getByText('$9,800.00')).toBeInTheDocument(); // totalAmount
  });

  it('has a status filter dropdown', () => {
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument();
  });

  it('renders invoice numbers in the table', () => {
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByText('INV-00001')).toBeInTheDocument();
    expect(screen.getByText('INV-00002')).toBeInTheDocument();
  });

  it('renders payment amounts formatted as currency', () => {
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
  });

  it('renders payment method types', () => {
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByText('card')).toBeInTheDocument();
    expect(screen.getByText('cash')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByText('succeeded')).toBeInTheDocument();
    expect(screen.getByText('refunded')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (usePayments as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<PaymentsPage />);
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('shows empty state when there are no payments', () => {
    (usePayments as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<PaymentsPage />);
    expect(screen.getByText(/no payments found/i)).toBeInTheDocument();
  });
});
