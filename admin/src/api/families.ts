import { apiClient } from '../lib/axios';
import type { Family } from '../types/family';

interface ListResult<T> { items: T[]; total: number; page: number; totalPages: number }

export const getFamilies = (params?: { page?: number; limit?: number }): Promise<ListResult<Family>> =>
  apiClient.get('/families', { params }).then((r) => ({ items: r.data.data.families, ...r.data.data }));

export const getFamily = (id: string): Promise<Family> =>
  apiClient.get(`/families/${id}`).then((r) => r.data.data.family);

export const createFamily = (body: { name: string; billingEmail?: string }): Promise<Family> =>
  apiClient.post('/families', body).then((r) => r.data.data.family);

export const updateFamily = (id: string, body: { name?: string; billingEmail?: string }): Promise<Family> =>
  apiClient.put(`/families/${id}`, body).then((r) => r.data.data.family);

export const deleteFamily = (id: string): Promise<void> =>
  apiClient.delete(`/families/${id}`).then(() => undefined);

export const initializeFamilyCardCheckout = (id: string): Promise<{ clientSecret: string; connectAccountId: string; publishableKey: string; customerId: string }> =>
  apiClient.post(`/families/${id}/card/initialize`).then((r) => r.data.data);

export const saveFamilyCardToken = (id: string, stripeCustomerId: string, stripeDefaultPaymentMethodId: string): Promise<Family> =>
  apiClient.post(`/families/${id}/card/token`, { stripeCustomerId, stripeDefaultPaymentMethodId }).then((r) => r.data.data.family);
