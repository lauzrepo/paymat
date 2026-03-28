const ACCESS_KEY = 'client_access_token';
const REFRESH_KEY = 'client_refresh_token';

export const authStore = {
  getAccessToken: () => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clearAuth: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
