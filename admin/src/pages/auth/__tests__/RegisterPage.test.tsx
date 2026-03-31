import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockMutation } from '../../../test/renderWithProviders';
import { RegisterPage } from '../RegisterPage';

vi.mock('../../../hooks/useAuth', () => ({ useRegister: vi.fn() }));

import { useRegister } from '../../../hooks/useAuth';

beforeEach(() => {
  (useRegister as Mock).mockReturnValue(mockMutation());
});

describe('RegisterPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
  });

  it('renders first name, last name, email, and password inputs', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a Create account button', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders a Sign in link', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows inline validation errors for empty fields on submit', async () => {
    renderWithProviders(<RegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
    });
  });

  it('shows error message when registration fails', () => {
    (useRegister as Mock).mockReturnValue({
      ...mockMutation(),
      error: { response: { data: { message: 'Email already in use' } } },
      isError: true,
    });
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
  });

  it('disables the button while pending', () => {
    (useRegister as Mock).mockReturnValue({ ...mockMutation(), isPending: true });
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('button', { name: /creat/i })).toBeDisabled();
  });

  it('calls useRegister with form values on submit', async () => {
    const mutate = vi.fn();
    (useRegister as Mock).mockReturnValue({ ...mockMutation(), mutate });
    renderWithProviders(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Jane', email: 'jane@example.com' })
      );
    });
  });
});
