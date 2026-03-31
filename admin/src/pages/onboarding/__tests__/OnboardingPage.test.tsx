import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { OnboardingPage } from '../OnboardingPage';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../../../store/authStore', () => ({
  authStore: { setSlug: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import axios from 'axios';

const INVITE = { email: 'jane@example.com', recipientName: 'Jane Doe', orgName: 'Acme Studio' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OnboardingPage', () => {
  it('shows loading state while verifying token', () => {
    (axios.get as Mock).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<OnboardingPage />, { route: '/onboarding?token=abc123' });
    expect(screen.getByText(/verifying your invite/i)).toBeInTheDocument();
  });

  it('shows invalid state when no token is in the URL', async () => {
    renderWithProviders(<OnboardingPage />, { route: '/onboarding' });
    await waitFor(() => {
      expect(screen.getByText(/invite not valid/i)).toBeInTheDocument();
    });
  });

  it('shows error message when token verification fails', async () => {
    (axios.get as Mock).mockRejectedValue({
      response: { data: { message: 'Invite has expired' } },
    });
    renderWithProviders(<OnboardingPage />, { route: '/onboarding?token=bad' });
    await waitFor(() => {
      expect(screen.getByText(/invite has expired/i)).toBeInTheDocument();
    });
  });

  it('shows setup form after successful token verification', async () => {
    (axios.get as Mock).mockResolvedValue({ data: { data: { invite: INVITE } } });
    renderWithProviders(<OnboardingPage />, { route: '/onboarding?token=abc123' });
    await waitFor(() => {
      expect(screen.getByText(/set up your account/i)).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('acme-studio')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

  it('shows validation error when password is too short', async () => {
    (axios.get as Mock).mockResolvedValue({ data: { data: { invite: INVITE } } });
    renderWithProviders(<OnboardingPage />, { route: '/onboarding?token=abc123' });
    await waitFor(() => screen.getByText(/set up your account/i));
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: 'short' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when passwords do not match', async () => {
    (axios.get as Mock).mockResolvedValue({ data: { data: { invite: INVITE } } });
    renderWithProviders(<OnboardingPage />, { route: '/onboarding?token=abc123' });
    await waitFor(() => screen.getByText(/set up your account/i));
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'Different1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows done state after successful account creation', async () => {
    (axios.get as Mock).mockResolvedValue({ data: { data: { invite: INVITE } } });
    (axios.post as Mock).mockResolvedValue({});
    renderWithProviders(<OnboardingPage />, { route: '/onboarding?token=abc123' });
    await waitFor(() => screen.getByText(/set up your account/i));
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
  });

  it('shows server error when account creation fails', async () => {
    (axios.get as Mock).mockResolvedValue({ data: { data: { invite: INVITE } } });
    (axios.post as Mock).mockRejectedValue({ response: { data: { message: 'Slug already taken' } } });
    renderWithProviders(<OnboardingPage />, { route: '/onboarding?token=abc123' });
    await waitFor(() => screen.getByText(/set up your account/i));
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/slug already taken/i)).toBeInTheDocument();
    });
  });
});
