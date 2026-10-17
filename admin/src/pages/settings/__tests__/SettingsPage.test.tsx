import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery } from '../../../test/renderWithProviders';
import { SettingsPage } from '../SettingsPage';

vi.mock('../../../hooks/useTenant', () => ({
  useTenantBranding: vi.fn(),
}));

vi.mock('../../../api/tenant', () => ({
  updateOrgSettings: vi.fn(),
}));

vi.mock('../../../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('../../../api/team', () => ({
  getTeam: vi.fn(),
  inviteStaff: vi.fn(),
  changeRole: vi.fn(),
  revokeAccess: vi.fn(),
  resendInvite: vi.fn(),
  cancelInvite: vi.fn(),
}));

vi.mock('../../../lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { useTenantBranding } from '../../../hooks/useTenant';
import { updateOrgSettings } from '../../../api/tenant';
import { useCurrentUser } from '../../../hooks/useAuth';
import { getTeam, inviteStaff, changeRole } from '../../../api/team';

const BRANDING = {
  name: 'Kings Martial Arts',
  type: 'martial_arts',
  timezone: 'America/New_York',
  primaryColor: '#4f46e5',
  logoUrl: '',
};

const ME = { id: 'u-me', email: 'me@example.com', firstName: 'Me', lastName: 'Admin', role: 'admin' };

const TEAM = {
  members: [
    { ...ME, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'u-admin2', email: 'partner@example.com', firstName: 'Pat', lastName: 'Partner', role: 'admin', createdAt: '2024-02-01T00:00:00.000Z' },
    { id: 'u-staff', email: 'staff@example.com', firstName: 'Sam', lastName: 'Staff', role: 'staff', createdAt: '2024-03-01T00:00:00.000Z' },
  ],
  pendingInvites: [
    { id: 'inv-1', email: 'new-admin@example.com', role: 'admin', createdAt: '2024-04-01T00:00:00.000Z' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  (useTenantBranding as Mock).mockReturnValue(mockQuery(BRANDING));
  (updateOrgSettings as Mock).mockResolvedValue(BRANDING);
  (useCurrentUser as Mock).mockReturnValue(mockQuery(ME));
  (getTeam as Mock).mockResolvedValue(TEAM);
});

describe('SettingsPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('hides the organization form while branding data is loading', () => {
    (useTenantBranding as Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('pre-fills org name input from branding data', () => {
    renderWithProviders(<SettingsPage />);
    const nameInput = screen.getByDisplayValue('Kings Martial Arts');
    expect(nameInput).toBeInTheDocument();
  });

  it('has a Save button for settings', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls updateOrgSettings when Save is clicked', async () => {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(updateOrgSettings as Mock).toHaveBeenCalled();
    });
  });

  it('shows success alert after saving', async () => {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await screen.findByText(/settings saved/i);
  });

  it('shows a timezone selector', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
  });
});

describe('SettingsPage — Team tab', () => {
  async function openTeamTab() {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'team' }));
    await screen.findByText('partner@example.com');
  }

  it('is hidden from staff', () => {
    (useCurrentUser as Mock).mockReturnValue(mockQuery({ ...ME, role: 'staff' }));
    renderWithProviders(<SettingsPage />);
    expect(screen.queryByRole('button', { name: 'team' })).not.toBeInTheDocument();
  });

  it('shows your own role as a badge and other members as role selects', async () => {
    await openTeamTab();
    expect(screen.getByText('admin (you)')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Role for me@example.com' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role for partner@example.com' })).toHaveValue('admin');
    expect(screen.getByRole('combobox', { name: 'Role for staff@example.com' })).toHaveValue('staff');
  });

  it('promotes a staff member after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (changeRole as Mock).mockResolvedValue({});
    await openTeamTab();
    fireEvent.change(screen.getByRole('combobox', { name: 'Role for staff@example.com' }), { target: { value: 'admin' } });
    await waitFor(() => expect(changeRole).toHaveBeenCalledWith('u-staff', 'admin'));
  });

  it('does not change the role when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await openTeamTab();
    fireEvent.change(screen.getByRole('combobox', { name: 'Role for partner@example.com' }), { target: { value: 'staff' } });
    expect(changeRole).not.toHaveBeenCalled();
  });

  it('shows the server error when a role change fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (changeRole as Mock).mockRejectedValue({ response: { data: { message: 'You cannot change your own role' } } });
    await openTeamTab();
    fireEvent.change(screen.getByRole('combobox', { name: 'Role for staff@example.com' }), { target: { value: 'admin' } });
    expect(await screen.findByText('You cannot change your own role')).toBeInTheDocument();
  });

  it('lets you remove other admins but not yourself', async () => {
    await openTeamTab();
    expect(screen.getByRole('button', { name: 'Remove partner@example.com' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove staff@example.com' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove me@example.com' })).not.toBeInTheDocument();
  });

  it('sends an invite with the selected role', async () => {
    (inviteStaff as Mock).mockResolvedValue({});
    await openTeamTab();
    fireEvent.change(screen.getByPlaceholderText('colleague@example.com'), { target: { value: 'co-owner@example.com' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Invite role' }), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(inviteStaff).toHaveBeenCalledWith('co-owner@example.com', 'admin'));
  });

  it('invites as staff by default', async () => {
    (inviteStaff as Mock).mockResolvedValue({});
    await openTeamTab();
    fireEvent.change(screen.getByPlaceholderText('colleague@example.com'), { target: { value: 'helper@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(inviteStaff).toHaveBeenCalledWith('helper@example.com', 'staff'));
  });

  it('shows the role of pending invites', async () => {
    await openTeamTab();
    const row = screen.getByText('new-admin@example.com').closest('tr')!;
    expect(within(row).getByText('admin')).toBeInTheDocument();
  });
});
