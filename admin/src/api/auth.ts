import { apiClient } from '../lib/axios';
import type { LoginRequest, RegisterRequest, User, AuthTokens } from '../types/auth';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const login = (body: LoginRequest): Promise<AuthResponse> =>
  apiClient.post('/auth/login', body).then((r) => r.data.data);

export const register = (body: RegisterRequest): Promise<AuthResponse> =>
  apiClient.post('/auth/register', body).then((r) => r.data.data);

export const logout = (): Promise<void> =>
  apiClient.post('/auth/logout').then(() => undefined);

export const getMe = (): Promise<User> =>
  apiClient.get('/auth/me').then((r) => r.data.data.user);

export const refreshToken = (token: string): Promise<AuthTokens> =>
  apiClient.post('/auth/refresh-token', { refreshToken: token }).then((r) => r.data.data);

export const forgotPassword = (email: string): Promise<{ message: string; resetUrl?: string }> =>
  apiClient.post('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = (token: string, newPassword: string): Promise<{ message: string }> =>
  apiClient.post('/auth/reset-password', { token, newPassword }).then((r) => r.data);
