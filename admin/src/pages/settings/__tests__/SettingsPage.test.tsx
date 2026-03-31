import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, mockQuery, mockMutation } from '../../../test/renderWithProviders';
import { SettingsPage } from '../SettingsPage';

vi.mock('../../../hooks/useTenant', () => ({
  useTenantBranding: vi.fn(),
}));

vi.mock('../../../hooks/useBilling', () => ({
  useRunBilling: vi.fn(),
}));

vi.mock('../../../api/tenant', () => ({
  updateOrgSettings: vi.fn(),
}));

vi.mock('../../../lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { useTenantBranding } from '../../../hooks/useTenant';
import { useRunBilling } from '../../../hooks/useBilling';
import { updateOrgSettings } from '../../../api/tenant';

const BRANDING = {
  name: 'Kings Martial Arts',
  type: 'martial_arts',
  timezone: 'America/New_York',
  primaryColor: '#4f46e5',
  logoUrl: '',
};

const RUN_RESULT = { invoicesCreated: 3, autoCharged: 2, errors: 0, activeEnrollments: 15 };

beforeEach(() => {
  vi.clearAllMocks();
  (useTenantBranding as Mock).mockReturnValue(mockQuery(BRANDING));
  (useRunBilling as Mock).mockReturnValue(
    mockMutation({ mutateAsync: vi.fn().mockResolvedValue(RUN_RESULT) })
  );
  (updateOrgSettings as Mock).mockResolvedValue(BRANDING);
});

describe('SettingsPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('renders nothing while branding data is loading', () => {
    (useTenantBranding as Mock).mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderWithProviders(<SettingsPage />);
    // SettingsPage returns null during load — only the root div exists
    expect(container.firstChild).toBeNull();
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

  it('renders the recurring billing section', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText(/recurring billing/i)).toBeInTheDocument();
  });

  it('has a Run billing now button', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('button', { name: /run billing now/i })).toBeInTheDocument();
  });

  it('shows billing result after run', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(RUN_RESULT);
    (useRunBilling as Mock).mockReturnValue(mockMutation({ mutateAsync }));
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /run billing now/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    await screen.findByText(/3 invoice/i);
  });

  it('shows a timezone selector', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
  });
});
