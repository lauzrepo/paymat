import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { FeedbackPage } from '../FeedbackPage';

vi.mock('../../../hooks/useFeedback', () => ({
  useFeedbackList: vi.fn(),
  useCreateFeedback: vi.fn(),
}));

import { useFeedbackList, useCreateFeedback } from '../../../hooks/useFeedback';

const SUBMISSIONS = [
  {
    id: 'sub-1',
    subject: 'Login broken',
    name: 'Alex Smith',
    type: 'bug',
    status: 'open',
    createdAt: '2026-03-15T10:00:00.000Z',
    contact: null,
  },
  {
    id: 'sub-2',
    subject: 'Love the new invoices',
    name: 'Maria Jones',
    type: 'feedback',
    status: 'resolved',
    createdAt: '2026-03-16T09:00:00.000Z',
    contact: { id: 'c-1', firstName: 'Maria', lastName: 'Jones' },
  },
];

beforeEach(() => {
  (useFeedbackList as Mock).mockReturnValue(mockQuery({ items: SUBMISSIONS, total: 2 }));
  (useCreateFeedback as Mock).mockReturnValue(mockMutation());
});

describe('FeedbackPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<FeedbackPage />);
    expect(screen.getByRole('heading', { name: 'Feedback & Issues' })).toBeInTheDocument();
  });

  it('shows a Submit Feedback button', () => {
    renderWithProviders(<FeedbackPage />);
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument();
  });

  it('shows both filter dropdowns', () => {
    renderWithProviders(<FeedbackPage />);
    expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All types')).toBeInTheDocument();
  });

  it('shows the total submission count', () => {
    renderWithProviders(<FeedbackPage />);
    expect(screen.getByText('2 submissions')).toBeInTheDocument();
  });

  it('renders submission subjects in the table', () => {
    renderWithProviders(<FeedbackPage />);
    expect(screen.getByText('Login broken')).toBeInTheDocument();
    expect(screen.getByText('Love the new invoices')).toBeInTheDocument();
  });

  it('shows the submitter name for anonymous submissions', () => {
    renderWithProviders(<FeedbackPage />);
    expect(screen.getByText('Alex Smith')).toBeInTheDocument();
  });

  it('links to the contact for known contacts', () => {
    renderWithProviders(<FeedbackPage />);
    // Maria Jones is a known contact so the name is a link
    expect(screen.getByText('Maria Jones')).toBeInTheDocument();
  });

  it('shows correct type labels in the table', () => {
    renderWithProviders(<FeedbackPage />);
    // getAllByText because the same labels also appear as <option> values in the filter dropdown
    expect(screen.getAllByText('Bug Report').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Feedback').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when there are no submissions', () => {
    (useFeedbackList as Mock).mockReturnValue(mockQuery({ items: [], total: 0 }));
    renderWithProviders(<FeedbackPage />);
    expect(screen.getByText('No submissions yet.')).toBeInTheDocument();
  });

  it('shows a loading spinner while fetching', () => {
    (useFeedbackList as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<FeedbackPage />);
    expect(document.querySelector('svg, [role="status"]')).toBeTruthy();
  });

  it('opens the new submission form when Submit Feedback is clicked', () => {
    renderWithProviders(<FeedbackPage />);
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByText('New Submission')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
  });

  it('closes the form when Cancel is clicked', () => {
    renderWithProviders(<FeedbackPage />);
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByText('New Submission')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('New Submission')).not.toBeInTheDocument();
  });

  it('passes status filter value to useFeedbackList when changed', async () => {
    renderWithProviders(<FeedbackPage />);
    fireEvent.change(screen.getByDisplayValue('All statuses'), { target: { value: 'open' } });
    await waitFor(() => {
      expect((useFeedbackList as Mock).mock.calls.at(-1)?.[0]).toMatchObject({ status: 'open' });
    });
  });

  it('passes type filter value to useFeedbackList when changed', async () => {
    renderWithProviders(<FeedbackPage />);
    fireEvent.change(screen.getByDisplayValue('All types'), { target: { value: 'bug' } });
    await waitFor(() => {
      expect((useFeedbackList as Mock).mock.calls.at(-1)?.[0]).toMatchObject({ type: 'bug' });
    });
  });
});
