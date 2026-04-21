import { apiClient } from '../lib/axios';
import type { SuperAdminUser } from '../store/authStore';

export const login = (email: string, password: string): Promise<{
  superAdmin: SuperAdminUser;
  accessToken: string;
  refreshToken: string;
}> => apiClient.post('/auth/login', { email, password }).then((r) => r.data.data);

export const getMe = (): Promise<SuperAdminUser> =>
  apiClient.get('/auth/me').then((r) => r.data.data.superAdmin);

export const changePassword = (currentPassword: string, newPassword: string): Promise<void> =>
  apiClient.post('/auth/change-password', { currentPassword, newPassword }).then(() => undefined);
