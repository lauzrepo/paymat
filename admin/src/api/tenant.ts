import { apiClient } from '../lib/axios';

export interface TenantBranding {
  name: string;
  type: string | null;
  timezone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

export const getTenantBranding = (): Promise<TenantBranding> =>
  apiClient.get('/organization/branding').then((r) => r.data.data);

export const updateOrgSettings = (body: Partial<{ name: string; type: string; timezone: string; logoUrl: string; primaryColor: string }>): Promise<TenantBranding> =>
  apiClient.put('/organization/settings', body).then((r) => r.data.data.organization);
