import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockMutation } from '../../../test/renderWithProviders';
import { ResetPasswordPage } from '../ResetPasswordPage';

vi.mock('../../../hooks/useAuth', () => ({ useResetPassword: vi.fn() }));

import { useResetPassword } from '../../../hooks/useAuth';

beforeEach(() => {
  (useResetPassword as Mock).mockReturnValue(mockMutation());
});

describe('ResetPasswordPage', () => {
  it('shows an error when no token is in the URL', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' });
    expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument();
  });

  it('renders the form when a token is present', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc123' });
    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders a Reset password button', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc123' });
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows success state after reset', () => {
    (useResetPassword as Mock).mockReturnValue({ ...mockMutation(), isSuccess: true });
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc123' });
    expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    expect(screen.getByText(/password has been reset/i)).toBeInTheDocument();
  });

  it('shows error message when reset fails', () => {
    (useResetPassword as Mock).mockReturnValue({
      ...mockMutation(),
      error: { response: { data: { message: 'Token expired' } } },
      isError: true,
    });
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc123' });
    expect(screen.getByText(/token expired/i)).toBeInTheDocument();
  });

  it('disables button while pending', () => {
    (useResetPassword as Mock).mockReturnValue({ ...mockMutation(), isPending: true });
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc123' });
    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
  });

  it('shows validation error when passwords do not match', async () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc123' });
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Different1' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  it('calls useResetPassword with token and password on valid submit', async () => {
    const mutate = vi.fn();
    (useResetPassword as Mock).mockReturnValue({ ...mockMutation(), mutate });
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc123' });
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'NewPass1' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'NewPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'abc123', newPassword: 'NewPass1' })
      );
    });
  });
});
