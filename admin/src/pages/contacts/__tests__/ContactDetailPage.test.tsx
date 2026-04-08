import { screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { ContactDetailPage } from '../ContactDetailPage';

vi.mock('../../../hooks/useContacts', () => ({
  useContact: vi.fn(),
  useDeactivateContact: vi.fn(),
  useReactivateContact: vi.fn(),
  useDeleteContact: vi.fn(),
}));

vi.mock('../../../api/contacts', () => ({
  initializeCardCheckout: vi.fn(),
  saveCardToken: vi.fn(),
}));

vi.mock('../../../lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'c-1' }),
    useNavigate: () => vi.fn(),
  };
});

import {
  useContact,
  useDeactivateContact,
  useReactivateContact,
  useDeleteContact,
} from '../../../hooks/useContacts';

const CONTACT = {
  id: 'c-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-1234',
  status: 'active',
  stripeCustomerId: null,
  stripeDefaultPaymentMethodId: null,
  family: null,
  dateOfBirth: null,
  notes: null,
  createdAt: '2024-01-15T00:00:00.000Z',
  enrollments: [],
  invoices: [],
};

beforeEach(() => {
  (useContact as Mock).mockReturnValue(mockQuery(CONTACT));
  (useDeactivateContact as Mock).mockReturnValue(mockMutation());
  (useReactivateContact as Mock).mockReturnValue(mockMutation());
  (useDeleteContact as Mock).mockReturnValue(mockMutation());
});

describe('ContactDetailPage', () => {
  it('shows spinner while loading', () => {
    (useContact as Mock).mockReturnValue(mockQuery(undefined, { isLoading: true }));
    const { container } = renderWithProviders(<ContactDetailPage />);
    expect(container.querySelector('svg') ?? container.querySelector('[class*="animate"]')).toBeTruthy();
  });

  it('shows not found when contact is null', () => {
    (useContact as Mock).mockReturnValue(mockQuery(null));
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText(/contact not found/i)).toBeInTheDocument();
  });

  it('renders the contact full name', () => {
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders the contact status badge', () => {
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders profile fields', () => {
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
  });

  it('shows no card on file when no payment method saved', () => {
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText(/none/i)).toBeInTheDocument();
  });

  it('shows saved card indicator when payment method is present', () => {
    (useContact as Mock).mockReturnValue(mockQuery({ ...CONTACT, stripeCustomerId: 'cus_abc', stripeDefaultPaymentMethodId: 'pm_abc' }));
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  it('shows no enrollments message when enrollments are empty', () => {
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText(/no enrollments/i)).toBeInTheDocument();
  });

  it('renders enrollments table when contact has enrollments', () => {
    (useContact as Mock).mockReturnValue(mockQuery({
      ...CONTACT,
      enrollments: [{
        id: 'e-1',
        status: 'active',
        startDate: '2024-01-01T00:00:00.000Z',
        program: { id: 'p-1', name: 'Beginner Karate', price: 80, billingFrequency: 'monthly' },
      }],
    }));
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText('Beginner Karate')).toBeInTheDocument();
  });

  it('shows no invoices message when invoices are empty', () => {
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText(/no invoices/i)).toBeInTheDocument();
  });

  it('renders invoices table when contact has invoices', () => {
    (useContact as Mock).mockReturnValue(mockQuery({
      ...CONTACT,
      invoices: [{
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        amountDue: 80,
        status: 'sent',
        dueDate: '2024-02-01T00:00:00.000Z',
      }],
    }));
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  it('shows deactivate button for active contacts', () => {
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument();
  });

  it('shows reactivate button for inactive contacts', () => {
    (useContact as Mock).mockReturnValue(mockQuery({ ...CONTACT, status: 'inactive' }));
    renderWithProviders(<ContactDetailPage />);
    expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
  });
});
