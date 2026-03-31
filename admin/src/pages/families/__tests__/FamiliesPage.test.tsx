import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { FamiliesPage } from '../FamiliesPage';

vi.mock('../../../hooks/useFamilies', () => ({
  useFamilies: vi.fn(),
  useCreateFamily: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import { useFamilies, useCreateFamily } from '../../../hooks/useFamilies';

const FAMILIES = [
  {
    id: 'fam-1',
    name: 'Johnson Family',
    billingEmail: 'johnson@example.com',
    createdAt: '2026-01-15T00:00:00.000Z',
    contacts: [{ id: 'c-1' }, { id: 'c-2' }],
  },
  {
    id: 'fam-2',
    name: 'Smith Family',
    billingEmail: null,
    createdAt: '2026-02-20T00:00:00.000Z',
    contacts: [{ id: 'c-3' }],
  },
];

beforeEach(() => {
  (useFamilies as Mock).mockReturnValue(mockQuery({ items: FAMILIES, total: 2 }));
  (useCreateFamily as Mock).mockReturnValue(
    mockMutation({ mutateAsync: vi.fn().mockResolvedValue({ id: 'fam-new' }) })
  );
});

describe('FamiliesPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<FamiliesPage />);
    expect(screen.getByRole('heading', { name: 'Families' })).toBeInTheDocument();
  });

  it('shows an Add Family button', () => {
    renderWithProviders(<FamiliesPage />);
    expect(screen.getByRole('button', { name: /add family/i })).toBeInTheDocument();
  });

  it('renders family names in the table', () => {
    renderWithProviders(<FamiliesPage />);
    expect(screen.getByText('Johnson Family')).toBeInTheDocument();
    expect(screen.getByText('Smith Family')).toBeInTheDocument();
  });

  it('renders billing emails in the table', () => {
    renderWithProviders(<FamiliesPage />);
    expect(screen.getByText('johnson@example.com')).toBeInTheDocument();
  });

  it('shows member counts in the table', () => {
    renderWithProviders(<FamiliesPage />);
    expect(screen.getByText('2')).toBeInTheDocument(); // Johnson Family has 2 members
    expect(screen.getByText('1')).toBeInTheDocument(); // Smith Family has 1 member
  });

  it('shows loading spinner while fetching', () => {
    (useFamilies as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<FamiliesPage />);
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('shows empty state when there are no families', () => {
    (useFamilies as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<FamiliesPage />);
    expect(screen.getByText(/no families yet/i)).toBeInTheDocument();
  });

  it('opens the new family form when Add Family is clicked', () => {
    renderWithProviders(<FamiliesPage />);
    fireEvent.click(screen.getByRole('button', { name: /add family/i }));
    expect(screen.getByText(/new family/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/family name/i)).toBeInTheDocument();
  });

  it('closes the form when Cancel is clicked', () => {
    renderWithProviders(<FamiliesPage />);
    fireEvent.click(screen.getByRole('button', { name: /add family/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/new family/i)).not.toBeInTheDocument();
  });

  it('shows "—" when a family has no billing email', () => {
    renderWithProviders(<FamiliesPage />);
    // Smith Family has no billing email, should show a dash
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
