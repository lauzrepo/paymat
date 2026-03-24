import { apiClient } from '../lib/axios';
import type { Contact } from '../types/contact';

interface ListResult<T> { items: T[]; total: number; page: number; totalPages: number }

export const getContacts = (params?: { page?: number; limit?: number; status?: string; search?: string; familyId?: string }): Promise<ListResult<Contact>> =>
  apiClient.get('/contacts', { params }).then((r) => ({ items: r.data.data.contacts, ...r.data.data }));

export const getContact = (id: string): Promise<Contact> =>
  apiClient.get(`/contacts/${id}`).then((r) => r.data.data.contact);

export const createContact = (body: Partial<Contact>): Promise<Contact> =>
  apiClient.post('/contacts', body).then((r) => r.data.data.contact);

export const updateContact = (id: string, body: Partial<Contact>): Promise<Contact> =>
  apiClient.put(`/contacts/${id}`, body).then((r) => r.data.data.contact);

export const deactivateContact = (id: string): Promise<Contact> =>
  apiClient.delete(`/contacts/${id}`).then((r) => r.data.data.contact);
