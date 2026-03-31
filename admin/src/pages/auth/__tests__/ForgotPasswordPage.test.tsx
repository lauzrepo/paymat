import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockMutation } from '../../../test/renderWithProviders';
import { ForgotPasswordPage } from '../ForgotPasswordPage';

vi.mock('../../../hooks/useAuth', () => ({ useForgotPassword: vi.fn() }));

import { useForgotPassword } from '../../../hooks/useAuth';

beforeEach(() => {
  (useForgotPassword as Mock).mockReturnValue(mockMutation());
});

describe('ForgotPasswordPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  it('renders an email input', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders a Send reset link button', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders a Back to login link', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });

  it('shows success state after submission', () => {
    (useForgotPassword as Mock).mockReturnValue({ ...mockMutation(), isSuccess: true });
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/password reset link has been sent/i)).toBeInTheDocument();
  });

  it('disables button while pending', () => {
    (useForgotPassword as Mock).mockReturnValue({ ...mockMutation(), isPending: true });
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('shows error when submission fails', () => {
    (useForgotPassword as Mock).mockReturnValue({
      ...mockMutation(),
      error: { response: { data: { message: 'Too many attempts' } } },
      isError: true,
    });
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
  });

  it('calls useForgotPassword with email on submit', async () => {
    const mutate = vi.fn();
    (useForgotPassword as Mock).mockReturnValue({ ...mockMutation(), mutate });
    renderWithProviders(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('jane@example.com', expect.any(Object)));
  });
});
