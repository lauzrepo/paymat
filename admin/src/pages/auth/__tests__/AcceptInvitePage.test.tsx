import { screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { AcceptInvitePage } from '../AcceptInvitePage';

vi.mock('../../../api/team', () => ({
  getStaffInvite: vi.fn(),
  acceptStaffInvite: vi.fn(),
}));

import { getStaffInvite } from '../../../api/team';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AcceptInvitePage', () => {
  it('shows an error without calling the API when the link has no token', () => {
    renderWithProviders(<AcceptInvitePage />, { route: '/accept-invite' });
    expect(screen.getByText('Invalid invite link.')).toBeInTheDocument();
    expect(getStaffInvite).not.toHaveBeenCalled();
  });

  it('shows the invite form once the token is verified', async () => {
    (getStaffInvite as Mock).mockResolvedValue({ email: 'new@example.com', role: 'staff', orgName: 'Acme Studio' });
    renderWithProviders(<AcceptInvitePage />, { route: '/accept-invite?token=tok-1' });
    expect(await screen.findByRole('heading', { name: 'Join Acme Studio' })).toBeInTheDocument();
    expect(getStaffInvite).toHaveBeenCalledWith('tok-1');
  });

  it('explains when the invite has already been used', async () => {
    (getStaffInvite as Mock).mockRejectedValue({ response: { status: 410 } });
    renderWithProviders(<AcceptInvitePage />, { route: '/accept-invite?token=tok-1' });
    expect(await screen.findByText(/already been used/i)).toBeInTheDocument();
  });
});
