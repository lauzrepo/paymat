const ACCESS_TOKEN_KEY = 'sa_access_token';
const REFRESH_TOKEN_KEY = 'sa_refresh_token';
const USER_KEY = 'sa_user';

export interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
}

export const authStore = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: (): SuperAdminUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  setUser: (user: SuperAdminUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isAuthenticated: (): boolean => !!localStorage.getItem(ACCESS_TOKEN_KEY),
};
