import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { BillingPage } from '../BillingPage';

vi.mock('../../../lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/axios';

const BILLING_INFO = {
  subscriptionStatus: 'active',
  stripeCustomerId: 'cus_abc123',
  stripeSubscriptionId: 'sub_abc123',
};

const INVOICE_STATS = {
  total: 25,
  paid: 18,
  overdue: 3,
  draft: 1,
  totalAmountDue: 8500,
  totalAmountPaid: 6200,
};

const RUN_RESULT = {
  invoicesCreated: 5,
  autoCharged: 4,
  errors: 0,
  activeEnrollments: 22,
};

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.get as Mock).mockImplementation((url: string) => {
    if (url === '/billing/status') return Promise.resolve({ data: { data: { billing: BILLING_INFO } } });
    if (url === '/invoices/stats') return Promise.resolve({ data: { data: { stats: INVOICE_STATS } } });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  (apiClient.post as Mock).mockResolvedValue({ data: { data: RUN_RESULT } });
});

describe('BillingPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<BillingPage />);
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument();
  });

  it('renders invoice stats after load', async () => {
    renderWithProviders(<BillingPage />);
    await screen.findByText('25'); // total invoices
    expect(screen.getByText('3')).toBeInTheDocument(); // overdue
  });

  it('shows collected amount formatted as currency', async () => {
    renderWithProviders(<BillingPage />);
    await screen.findByText('$6,200.00');
  });

  it('shows outstanding amount (due minus paid)', async () => {
    renderWithProviders(<BillingPage />);
    await screen.findByText('$2,300.00'); // 8500 - 6200
  });

  it('renders the Run billing now button', () => {
    renderWithProviders(<BillingPage />);
    expect(screen.getByRole('button', { name: /run billing now/i })).toBeInTheDocument();
  });

  it('shows run results after clicking the button', async () => {
    renderWithProviders(<BillingPage />);
    fireEvent.click(screen.getByRole('button', { name: /run billing now/i }));
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // invoicesCreated
    });
    expect(screen.getByText('4')).toBeInTheDocument(); // autoCharged
    expect(screen.getByText('22')).toBeInTheDocument(); // activeEnrollments
  });

  it('calls POST /billing/run when the button is clicked', async () => {
    renderWithProviders(<BillingPage />);
    fireEvent.click(screen.getByRole('button', { name: /run billing now/i }));
    await waitFor(() => {
      expect(apiClient.post as Mock).toHaveBeenCalledWith('/billing/run');
    });
  });

  it('shows the Paymat subscription section', async () => {
    renderWithProviders(<BillingPage />);
    await screen.findByText('Paymat subscription');
  });

  it('shows active subscription status badge', async () => {
    renderWithProviders(<BillingPage />);
    await screen.findByText('Active');
  });

  it('shows Manage subscription button when stripe customer exists and subscription is active', async () => {
    renderWithProviders(<BillingPage />);
    await screen.findByRole('button', { name: /manage subscription/i });
  });

  it('does not show Manage subscription button when not subscribed', async () => {
    (apiClient.get as Mock).mockImplementation((url: string) => {
      if (url === '/billing/status')
        return Promise.resolve({ data: { data: { billing: { subscriptionStatus: 'inactive', stripeCustomerId: null, stripeSubscriptionId: null } } } });
      if (url === '/invoices/stats')
        return Promise.resolve({ data: { data: { stats: INVOICE_STATS } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    renderWithProviders(<BillingPage />);
    await screen.findByText('Not subscribed');
    expect(screen.queryByRole('button', { name: /manage subscription/i })).not.toBeInTheDocument();
  });

  it('shows success banner when ?success=true is in the URL', async () => {
    renderWithProviders(<BillingPage />, { route: '/billing?success=true' });
    expect(screen.getByText(/subscription activated successfully/i)).toBeInTheDocument();
  });

  it('shows canceled banner when ?canceled=true is in the URL', async () => {
    renderWithProviders(<BillingPage />, { route: '/billing?canceled=true' });
    expect(screen.getByText(/checkout was canceled/i)).toBeInTheDocument();
  });

  it('shows an error banner when the billing run fails', async () => {
    (apiClient.post as Mock).mockRejectedValue(new Error('Server error'));
    renderWithProviders(<BillingPage />);
    fireEvent.click(screen.getByRole('button', { name: /run billing now/i }));
    await screen.findByText(/billing run failed/i);
  });
});
