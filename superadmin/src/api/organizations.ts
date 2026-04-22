import { apiClient } from '../lib/axios';
import type { Organization } from '../types/organization';

interface ListResult { organizations: Organization[]; total: number; page: number; totalPages: number }

export const getOrganizations = (params?: { page?: number; search?: string }): Promise<ListResult> =>
  apiClient.get('/organizations', { params }).then((r) => r.data.data);

export const getOrganization = (id: string): Promise<Organization> =>
  apiClient.get(`/organizations/${id}`).then((r) => r.data.data.organization);

export const createOrganization = (body: {
  name: string;
  slug: string;
  type?: string;
  timezone?: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
}): Promise<Organization> =>
  apiClient.post('/organizations', body).then((r) => r.data.data.organization);

export const updateOrganization = (id: string, body: {
  name?: string;
  slug?: string;
  type?: string;
  timezone?: string;
  logoUrl?: string;
  primaryColor?: string;
}): Promise<Organization> =>
  apiClient.put(`/organizations/${id}`, body).then((r) => r.data.data.organization);

export const setOrganizationActive = (id: string, active: boolean): Promise<Organization> =>
  apiClient.patch(`/organizations/${id}/status`, { active }).then((r) => r.data.data.organization);

export const deleteOrganization = (id: string): Promise<void> =>
  apiClient.delete(`/organizations/${id}`).then(() => undefined);

export const promoteToProduction = (id: string): Promise<{ emailSentTo: string }> =>
  apiClient.post(`/organizations/${id}/promote`).then((r) => r.data.data);

export const sendBillingCheckout = (orgId: string): Promise<{ url: string }> =>
  apiClient.post(`/billing/send-checkout/${orgId}`).then((r) => r.data.data);

export const getBillingPortalLink = (orgId: string): Promise<{ url: string }> =>
  apiClient.post(`/billing/portal/${orgId}`).then((r) => r.data.data);
