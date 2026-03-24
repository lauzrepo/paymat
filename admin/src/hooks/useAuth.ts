import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../store/authStore';
import { queryClient } from '../lib/queryClient';
import * as authApi from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types/auth';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    enabled: authStore.isAuthenticated(),
    initialData: authStore.getUser() ?? undefined,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLogin() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (data) => {
      authStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      authStore.setUser(data.user);
      queryClient.setQueryData(['currentUser'], data.user);
      navigate('/');
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: (data) => {
      authStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      authStore.setUser(data.user);
      queryClient.setQueryData(['currentUser'], data.user);
      navigate('/');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      authStore.clearAuth();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      setTimeout(() => navigate('/login'), 2000);
    },
  });
}
