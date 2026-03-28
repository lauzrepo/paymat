import { apiClient } from '../lib/axios';

export interface InviteToken {
  id: string;
  token: string;
  email: string;
  recipientName: string;
  orgName: string;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CreateInviteInput {
  email: string;
  recipientName: string;
  orgName: string;
}

export const createInvite = (input: CreateInviteInput): Promise<InviteToken> =>
  apiClient.post('/invites', input).then((r) => r.data.data.invite);

export const listInvites = (params?: { page?: number }): Promise<{ items: InviteToken[]; total: number }> =>
  apiClient.get('/invites', { params }).then((r) => r.data.data);
