import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { authStore } from '../store/authStore';
import * as api from '../api/auth';
import { useOrgSlug } from '../context/OrgSlugContext';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: api.getMe,
    enabled: !!authStore.getAccessToken(),
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: ({ accessToken, refreshToken }) => {
      authStore.setTokens({ accessToken, refreshToken });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  return () => {
    authStore.clearAuth();
    queryClient.clear();
    // Caller is responsible for navigating to /:orgSlug/login
  };
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.forgotPassword(email),
  });
}

export function useResetPassword() {
  const orgSlug = useOrgSlug();
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      api.resetPassword(token, newPassword),
    onSuccess: () => {
      setTimeout(() => { window.location.href = `/${orgSlug}/login`; }, 2000);
    },
  });
}
