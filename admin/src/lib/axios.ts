import axios from 'axios';
import { authStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

async function doRefresh(): Promise<string> {
  const refreshToken = authStore.getRefreshToken();
  if (!refreshToken) {
    authStore.clearAuth();
    window.location.href = '/login';
    throw new Error('No refresh token');
  }

  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const { data } = await axios.post(`${API_BASE}/api/auth/refresh-token`, { refreshToken });
    const { accessToken, refreshToken: newRefresh } = data.data;
    authStore.setTokens({ accessToken, refreshToken: newRefresh });
    processQueue(null, accessToken);
    return accessToken;
  } catch (err) {
    processQueue(err, null);
    authStore.clearAuth();
    window.location.href = '/login';
    throw err;
  } finally {
    isRefreshing = false;
  }
}

// Proactively refresh the token before a request if it's expired/near-expiry
apiClient.interceptors.request.use(async (config) => {
  let token = authStore.getAccessToken();

  if (token && authStore.isAccessTokenExpired()) {
    token = await doRefresh();
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  const slug = authStore.getSlug();
  if (slug) config.headers['x-organization-slug'] = slug;
  return config;
});

// Fallback: handle 401s that slip through (clock skew, server-side revocation, etc.)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const accessToken = await doRefresh();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
