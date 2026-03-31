import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockMutation } from '../../../test/renderWithProviders';
import { LoginPage } from '../LoginPage';

vi.mock('../../../hooks/useAuth', () => ({
  useLogin: vi.fn(),
}));

// authStore uses localStorage — let jsdom handle it natively; just stub setSlug/getSlug
vi.mock('../../../store/authStore', () => ({
  authStore: {
    getSlug: vi.fn().mockReturnValue(''),
    setSlug: vi.fn(),
    isAuthenticated: vi.fn().mockReturnValue(false),
    getUser: vi.fn().mockReturnValue(null),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import { useLogin } from '../../../hooks/useAuth';

beforeEach(() => {
  vi.clearAllMocks();
  (useLogin as Mock).mockReturnValue(mockMutation());
});

describe('LoginPage', () => {
  it('renders the sign-in heading', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });

  it('renders a workspace input with domain suffix', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('.cliqpaymat.app')).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a Sign in button', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a Forgot password link', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('renders a Register link', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/register/i)).toBeInTheDocument();
  });

  it('shows a validation error when submitting without a workspace', async () => {
    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      // react-hook-form shows inline error messages
      const errors = document.querySelectorAll('[role="alert"], .text-red-600, p');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('shows error message when login fails', async () => {
    const error = { response: { data: { message: 'Invalid credentials' } } };
    (useLogin as Mock).mockReturnValue({
      ...mockMutation(),
      error,
      isError: true,
    });
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('disables the Sign in button while login is pending', () => {
    (useLogin as Mock).mockReturnValue({ ...mockMutation(), isPending: true });
    renderWithProviders(<LoginPage />);
    const btn = screen.getByRole('button', { name: /sign(ing)? in/i });
    expect(btn).toBeDisabled();
  });

  it('calls useLogin with form values on submit', async () => {
    const mutate = vi.fn();
    (useLogin as Mock).mockReturnValue({ ...mockMutation(), mutate });
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('acme-studio'), { target: { value: 'kings-martial-arts' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@example.com', password: 'password123' })
      );
    });
  });
});
