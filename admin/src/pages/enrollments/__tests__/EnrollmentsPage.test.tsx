import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { EnrollmentsPage } from '../EnrollmentsPage';

vi.mock('../../../hooks/useEnrollments', () => ({
  useEnrollments: vi.fn(),
  useEnroll: vi.fn(),
  useUnenroll: vi.fn(),
  useDeleteEnrollment: vi.fn(),
  usePauseEnrollment: vi.fn(),
  useResumeEnrollment: vi.fn(),
}));

vi.mock('../../../hooks/useContacts', () => ({
  useContacts: vi.fn(),
}));

vi.mock('../../../hooks/usePrograms', () => ({
  usePrograms: vi.fn(),
}));

import { useEnrollments, useEnroll, useUnenroll, useDeleteEnrollment, usePauseEnrollment, useResumeEnrollment } from '../../../hooks/useEnrollments';
import { useContacts } from '../../../hooks/useContacts';
import { usePrograms } from '../../../hooks/usePrograms';

const ENROLLMENTS = [
  {
    id: 'enr-1',
    contactId: 'c-1',
    status: 'active',
    startDate: '2026-01-01T00:00:00.000Z',
    contact: { firstName: 'Jane', lastName: 'Doe' },
    program: { name: 'Beginner Karate', price: 120 },
  },
  {
    id: 'enr-2',
    contactId: 'c-2',
    status: 'paused',
    startDate: '2026-02-01T00:00:00.000Z',
    contact: { firstName: 'Liam', lastName: 'Johnson' },
    program: { name: 'Advanced Karate', price: 150 },
  },
];

beforeEach(() => {
  (useEnrollments as Mock).mockReturnValue(mockQuery({ items: ENROLLMENTS, total: 2 }));
  (useEnroll as Mock).mockReturnValue(mockMutation());
  (useUnenroll as Mock).mockReturnValue(mockMutation());
  (useDeleteEnrollment as Mock).mockReturnValue(mockMutation());
  (usePauseEnrollment as Mock).mockReturnValue(mockMutation());
  (useResumeEnrollment as Mock).mockReturnValue(mockMutation());
  (useContacts as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
  (usePrograms as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
});

describe('EnrollmentsPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByRole('heading', { name: 'Enrollments' })).toBeInTheDocument();
  });

  it('shows an Enroll button', () => {
    renderWithProviders(<EnrollmentsPage />);
    // Use exact name to avoid matching "Unenroll" row-action buttons
    expect(screen.getByRole('button', { name: 'Enroll' })).toBeInTheDocument();
  });

  it('has a status filter dropdown', () => {
    renderWithProviders(<EnrollmentsPage />);
    // Check for the option element rather than the controlled select's displayValue
    expect(screen.getByRole('option', { name: 'All statuses' })).toBeInTheDocument();
  });

  it('renders contact names in the table', () => {
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Liam Johnson')).toBeInTheDocument();
  });

  it('renders program names in the table', () => {
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByText('Beginner Karate')).toBeInTheDocument();
    expect(screen.getByText('Advanced Karate')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('paused')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (useEnrollments as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<EnrollmentsPage />);
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('shows empty state when there are no enrollments', () => {
    (useEnrollments as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByText(/no enrollments found/i)).toBeInTheDocument();
  });

  it('opens the enroll form when Enroll button is clicked', () => {
    renderWithProviders(<EnrollmentsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));
    expect(screen.getByText(/new enrollment/i)).toBeInTheDocument();
  });

  it('closes the enroll form when Cancel is clicked', () => {
    renderWithProviders(<EnrollmentsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/new enrollment/i)).not.toBeInTheDocument();
  });

  it('shows program prices in the table', () => {
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('shows a Pause button for active enrollments', () => {
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows a Resume button for paused enrollments', () => {
    renderWithProviders(<EnrollmentsPage />);
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });
});
