import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { authStore } from '../store/authStore';
import * as api from '../api/auth';

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
    window.location.href = '/login';
  };
}
