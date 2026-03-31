import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { ProgramsPage } from '../ProgramsPage';

vi.mock('../../../hooks/usePrograms', () => ({
  usePrograms: vi.fn(),
  useCreateProgram: vi.fn(),
  useUpdateProgram: vi.fn(),
  useDeleteProgram: vi.fn(),
}));

import { usePrograms, useCreateProgram, useUpdateProgram, useDeleteProgram } from '../../../hooks/usePrograms';

const PROGRAMS = [
  {
    id: 'prog-1',
    name: 'Beginner Karate',
    description: 'Great for newcomers',
    price: 120,
    billingFrequency: 'monthly',
    capacity: 20,
    maxBillingCycles: null,
    isActive: true,
    _count: { enrollments: 8 },
  },
  {
    id: 'prog-2',
    name: 'Advanced Karate',
    description: null,
    price: 150,
    billingFrequency: 'monthly',
    capacity: null,
    maxBillingCycles: 12,
    isActive: true,
    _count: { enrollments: 3 },
  },
];

beforeEach(() => {
  (usePrograms as Mock).mockReturnValue(mockQuery({ items: PROGRAMS, total: 2 }));
  (useCreateProgram as Mock).mockReturnValue(mockMutation());
  (useUpdateProgram as Mock).mockReturnValue(mockMutation());
  (useDeleteProgram as Mock).mockReturnValue(mockMutation());
});

describe('ProgramsPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<ProgramsPage />);
    expect(screen.getByRole('heading', { name: 'Programs' })).toBeInTheDocument();
  });

  it('shows an Add Program button', () => {
    renderWithProviders(<ProgramsPage />);
    expect(screen.getByRole('button', { name: /add program/i })).toBeInTheDocument();
  });

  it('renders program names in the table', () => {
    renderWithProviders(<ProgramsPage />);
    expect(screen.getByText('Beginner Karate')).toBeInTheDocument();
    expect(screen.getByText('Advanced Karate')).toBeInTheDocument();
  });

  it('shows program prices', () => {
    renderWithProviders(<ProgramsPage />);
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('shows enrollment counts', () => {
    renderWithProviders(<ProgramsPage />);
    // "8 / 20" because capacity = 20; "3" standalone (no capacity)
    expect(screen.getByText('8 / 20')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (usePrograms as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<ProgramsPage />);
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('shows empty state when there are no programs', () => {
    (usePrograms as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<ProgramsPage />);
    expect(screen.getByText(/no programs yet/i)).toBeInTheDocument();
  });

  it('opens the new program form when Add Program is clicked', () => {
    renderWithProviders(<ProgramsPage />);
    fireEvent.click(screen.getByRole('button', { name: /add program/i }));
    expect(screen.getByText(/new program/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('closes the form when Cancel is clicked', () => {
    renderWithProviders(<ProgramsPage />);
    fireEvent.click(screen.getByRole('button', { name: /add program/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/new program/i)).not.toBeInTheDocument();
  });

  it('shows billing frequency in the table', () => {
    renderWithProviders(<ProgramsPage />);
    const monthlyCells = screen.getAllByText(/monthly/i);
    expect(monthlyCells.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Edit and Delete buttons for each program', () => {
    renderWithProviders(<ProgramsPage />);
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons.length).toBe(2);
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(2);
  });
});
