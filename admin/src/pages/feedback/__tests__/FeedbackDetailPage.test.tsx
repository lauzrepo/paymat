import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { FeedbackDetailPage } from '../FeedbackDetailPage';

vi.mock('../../../hooks/useFeedback', () => ({
  useFeedbackSubmission: vi.fn(),
  useUpdateFeedbackStatus: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'sub-1' }) };
});

import { useFeedbackSubmission, useUpdateFeedbackStatus } from '../../../hooks/useFeedback';

const SUBMISSION = {
  id: 'sub-1',
  subject: 'Login issue',
  message: 'I cannot log in to the platform.',
  type: 'bug',
  status: 'open',
  name: 'John Smith',
  email: 'john@example.com',
  contact: null,
  createdAt: '2024-01-15T00:00:00.000Z',
};

beforeEach(() => {
  (useFeedbackSubmission as Mock).mockReturnValue(mockQuery(SUBMISSION));
  (useUpdateFeedbackStatus as Mock).mockReturnValue(mockMutation());
});

describe('FeedbackDetailPage', () => {
  it('shows spinner while loading', () => {
    (useFeedbackSubmission as Mock).mockReturnValue(mockQuery(undefined, { isLoading: true }));
    const { container } = renderWithProviders(<FeedbackDetailPage />);
    expect(container.querySelector('svg') ?? container.querySelector('[class*="spinner"], [class*="animate"]')).toBeTruthy();
  });

  it('shows not found message when submission is null', () => {
    (useFeedbackSubmission as Mock).mockReturnValue(mockQuery(null));
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByText(/submission not found/i)).toBeInTheDocument();
  });

  it('renders the submission subject as heading', () => {
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByText('Login issue')).toBeInTheDocument();
  });

  it('renders the type label', () => {
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByText('Bug Report')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('renders the submitter name', () => {
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders the message body', () => {
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByText(/cannot log in to the platform/i)).toBeInTheDocument();
  });

  it('renders the status update dropdown', () => {
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls updateStatus when dropdown value changes', () => {
    const mutate = vi.fn();
    (useUpdateFeedbackStatus as Mock).mockReturnValue({ ...mockMutation(), mutate });
    renderWithProviders(<FeedbackDetailPage />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'resolved' } });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub-1', status: 'resolved' })
    );
  });

  it('renders a link to the contact when contact is present', () => {
    (useFeedbackSubmission as Mock).mockReturnValue(mockQuery({
      ...SUBMISSION,
      contact: { id: 'c-1', firstName: 'Jane', lastName: 'Doe' },
    }));
    renderWithProviders(<FeedbackDetailPage />);
    expect(screen.getByRole('link', { name: /jane doe/i })).toBeInTheDocument();
  });
});
