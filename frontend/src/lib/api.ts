import axios from 'axios';
import { authStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

let currentOrgSlug = '';
export function setOrgSlug(slug: string) { currentOrgSlug = slug; }

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (currentOrgSlug) config.headers['x-organization-slug'] = currentOrgSlug;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = authStore.getRefreshToken();
      if (!refreshToken) {
        authStore.clearAuth();
        window.location.href = `/${currentOrgSlug}/login`;
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        authStore.setTokens({ accessToken, refreshToken: newRefresh });
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (err) {
        processQueue(err, null);
        authStore.clearAuth();
        window.location.href = `/${currentOrgSlug}/login`;
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
