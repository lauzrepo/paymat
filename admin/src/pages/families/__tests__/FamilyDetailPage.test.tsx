import { screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { FamilyDetailPage } from '../FamilyDetailPage';

vi.mock('../../../hooks/useFamilies', () => ({
  useFamily: vi.fn(),
  useDeleteFamily: vi.fn(),
}));

vi.mock('../../../api/families', () => ({
  initializeFamilyCardCheckout: vi.fn(),
  saveFamilyCardToken: vi.fn(),
}));

vi.mock('../../../lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'f-1' }),
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

import { useFamily, useDeleteFamily } from '../../../hooks/useFamilies';

const FAMILY = {
  id: 'f-1',
  name: 'Johnson Family',
  billingEmail: 'johnson@example.com',
  helcimToken: null,
  createdAt: '2024-01-15T00:00:00.000Z',
  contacts: [],
};

beforeEach(() => {
  (useFamily as Mock).mockReturnValue(mockQuery(FAMILY));
  (useDeleteFamily as Mock).mockReturnValue(mockMutation());
});

describe('FamilyDetailPage', () => {
  it('shows spinner while loading', () => {
    (useFamily as Mock).mockReturnValue(mockQuery(undefined, { isLoading: true }));
    const { container } = renderWithProviders(<FamilyDetailPage />);
    expect(container.querySelector('svg') ?? container.querySelector('[class*="animate"]')).toBeTruthy();
  });

  it('shows not found message when family is null', () => {
    (useFamily as Mock).mockReturnValue(mockQuery(null));
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByText(/family not found/i)).toBeInTheDocument();
  });

  it('renders the family name as heading', () => {
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByText('Johnson Family')).toBeInTheDocument();
  });

  it('renders billing email', () => {
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByText('johnson@example.com')).toBeInTheDocument();
  });

  it('shows no card on file when helcimToken is null', () => {
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByText(/^none$/i)).toBeInTheDocument();
  });

  it('shows saved card indicator when helcimToken is present', () => {
    (useFamily as Mock).mockReturnValue(mockQuery({ ...FAMILY, helcimToken: 'tok_family' }));
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  it('shows no members message when contacts are empty', () => {
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByText(/no members yet/i)).toBeInTheDocument();
  });

  it('renders members table when family has contacts', () => {
    (useFamily as Mock).mockReturnValue(mockQuery({
      ...FAMILY,
      contacts: [
        { id: 'c-1', firstName: 'Emma', lastName: 'Johnson', status: 'active' },
      ],
    }));
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByText('Emma Johnson')).toBeInTheDocument();
  });

  it('renders Save card on file button', () => {
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByRole('button', { name: /save card on file/i })).toBeInTheDocument();
  });

  it('renders Delete button', () => {
    renderWithProviders(<FamilyDetailPage />);
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });
});
