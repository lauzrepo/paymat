import { apiClient } from '../lib/api';

export interface TenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  sandboxMode?: boolean;
  classBookingEnabled?: boolean;
}

export const getTenantBranding = (): Promise<TenantBranding> =>
  apiClient.get('/organization/branding').then((r) => r.data.data);
