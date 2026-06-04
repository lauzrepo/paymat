import { apiClient } from '../lib/axios';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  createdAt: string;
}

export interface TeamData {
  members: TeamMember[];
  pendingInvites: PendingInvite[];
}

export const getTeam = (): Promise<TeamData> =>
  apiClient.get('/team').then((r) => r.data.data);

export const inviteStaff = (email: string): Promise<PendingInvite> =>
  apiClient.post('/team/invite', { email }).then((r) => r.data.data.invite);

export const revokeAccess = (userId: string): Promise<void> =>
  apiClient.delete(`/team/${userId}`).then(() => undefined);

export const resendInvite = (inviteId: string): Promise<void> =>
  apiClient.post(`/team/invite/${inviteId}/resend`).then(() => undefined);

export const cancelInvite = (inviteId: string): Promise<void> =>
  apiClient.delete(`/team/invite/${inviteId}`).then(() => undefined);

// Public — no auth, no org header
export const getStaffInvite = (token: string): Promise<{ email: string; orgName: string }> =>
  axios.get(`${API_BASE}/api/team/invite/${token}`).then((r) => r.data.data);

export const acceptStaffInvite = (token: string, body: { firstName: string; lastName: string; password: string }): Promise<void> =>
  axios.post(`${API_BASE}/api/team/invite/${token}/accept`, body).then(() => undefined);
