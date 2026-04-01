import { apiClient } from '../lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data.data as { accessToken: string; refreshToken: string; user: User };
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.data.user as User;
}

export async function logout() {
  // JWT is stateless — just clear local tokens
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data as { status: string; message: string };
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await apiClient.post('/auth/reset-password', { token, newPassword });
  return data as { status: string };
}
