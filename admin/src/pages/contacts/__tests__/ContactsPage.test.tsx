import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { ContactsPage } from '../ContactsPage';

vi.mock('../../../hooks/useContacts', () => ({
  useContacts: vi.fn(),
  useCreateContact: vi.fn(),
  useDeactivateContact: vi.fn(),
  useReactivateContact: vi.fn(),
  useDeleteContact: vi.fn(),
}));

vi.mock('../../../hooks/useFamilies', () => ({
  useFamilies: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import { useContacts, useCreateContact, useDeactivateContact, useReactivateContact, useDeleteContact } from '../../../hooks/useContacts';
import { useFamilies } from '../../../hooks/useFamilies';

const CONTACTS = [
  {
    id: 'c-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '555-0101',
    status: 'active',
    createdAt: '2026-01-10T00:00:00.000Z',
    family: null,
  },
  {
    id: 'c-2',
    firstName: 'Liam',
    lastName: 'Johnson',
    email: 'liam@example.com',
    phone: null,
    status: 'inactive',
    createdAt: '2026-02-01T00:00:00.000Z',
    family: { id: 'fam-1', name: 'Johnson Family' },
  },
];

beforeEach(() => {
  (useContacts as Mock).mockReturnValue(mockQuery({ items: CONTACTS, total: 2 }));
  (useCreateContact as Mock).mockReturnValue(mockMutation({ mutateAsync: vi.fn().mockResolvedValue({ id: 'c-new' }) }));
  (useDeactivateContact as Mock).mockReturnValue(mockMutation());
  (useReactivateContact as Mock).mockReturnValue(mockMutation());
  (useDeleteContact as Mock).mockReturnValue(mockMutation());
  (useFamilies as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
});

describe('ContactsPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByRole('heading', { name: 'Contacts' })).toBeInTheDocument();
  });

  it('shows Add Contact button', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders contact names in the table', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Liam Johnson')).toBeInTheDocument();
  });

  it('renders contact email', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows active/inactive status badges', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (useContacts as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<ContactsPage />);
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('shows empty state when there are no contacts', () => {
    (useContacts as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<ContactsPage />);
    expect(screen.getByText(/no contacts/i)).toBeInTheDocument();
  });

  it('opens the new contact form when Add Contact is clicked', () => {
    renderWithProviders(<ContactsPage />);
    fireEvent.click(screen.getByRole('button', { name: /add contact/i }));
    expect(screen.getByText('New Contact')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
  });

  it('closes the form when Cancel is clicked', () => {
    renderWithProviders(<ContactsPage />);
    fireEvent.click(screen.getByRole('button', { name: /add contact/i }));
    expect(screen.getByText('New Contact')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('New Contact')).not.toBeInTheDocument();
  });

  it('shows the family name for contacts who belong to a family', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByText('Johnson Family')).toBeInTheDocument();
  });
});
