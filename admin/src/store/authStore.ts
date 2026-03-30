import type { User, AuthTokens } from '../types/auth';

const ACCESS_TOKEN_KEY = 'pp_access_token';
const REFRESH_TOKEN_KEY = 'pp_refresh_token';
const USER_KEY = 'pp_user';
const SLUG_KEY = 'pp_org_slug';

export const authStore = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: (): User | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  getSlug: (): string => localStorage.getItem(SLUG_KEY) ?? '',
  setSlug: (slug: string) => localStorage.setItem(SLUG_KEY, slug),
  setTokens: (tokens: AuthTokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  setUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // slug intentionally kept so workspace field stays pre-filled on next login
  },
  isAuthenticated: (): boolean => !!localStorage.getItem(ACCESS_TOKEN_KEY),
};
