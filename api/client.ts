import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Production Base URL ────────────────────────────────────────────────────────
const BASE_URL = 'https://agrinex-backend-c1ig.onrender.com';

// ─── Exponential Backoff Configuration ──────────────────────────────────────────
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 8000;     // 8 seconds cap

// Routes that should NOT be retried (idempotency-sensitive)
const NO_RETRY_ROUTES = [
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/register',
  '/auth/set-password',
  '/posts',              // POST create
];

/**
 * Sleep utility for exponential backoff
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff + jitter
 */
const getBackoffDelay = (attempt: number): number => {
  const base = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 500; // 0-500ms jitter
  return Math.min(base + jitter, MAX_RETRY_DELAY_MS);
};

// ─── Axios Instance ─────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds — handles Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Inject JWT ────────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const { useAuthStore } = require('../store/useAuthStore');
      const state = useAuthStore.getState();
      if (state.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch (e) {
      // AuthStore might not be initialized yet during app boot
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Auto-logout on 401, Exponential Backoff Retry ────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
      _isRetry?: boolean;
    };

    if (!config) return Promise.reject(error);

    // ── Auto-logout on 401 (expired token) ──────────────────────────────────
    if (error.response?.status === 401 && !config._isRetry) {
      try {
        const { useAuthStore } = require('../store/useAuthStore');
        const state = useAuthStore.getState();
        if (state.isAuthenticated) {
          console.log('[API] Token expired — logging out');
          state.logout();
        }
      } catch (e) {}
      return Promise.reject(error);
    }

    // ── Skip retry for idempotency-sensitive routes ─────────────────────────
    const url = config.url || '';
    const method = (config.method || 'get').toLowerCase();
    const isNoRetry = NO_RETRY_ROUTES.some(route => url.includes(route)) && method === 'post';
    if (isNoRetry) {
      return Promise.reject(error);
    }

    // ── Exponential Backoff Retry for network/timeout errors ────────────────
    const isNetworkError = !error.response; // No response = network failure
    const isTimeout = error.code === 'ECONNABORTED';
    const is5xx = error.response && error.response.status >= 500;

    if ((isNetworkError || isTimeout || is5xx) && !config._isRetry) {
      config._retryCount = config._retryCount || 0;

      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;
        const delay = getBackoffDelay(config._retryCount - 1);

        console.log(
          `[API] Retry ${config._retryCount}/${MAX_RETRIES} for ${config.url} ` +
          `(${isTimeout ? 'timeout' : is5xx ? `${error.response?.status}` : 'network error'}) ` +
          `— waiting ${Math.round(delay)}ms`
        );

        await sleep(delay);
        return api(config);
      }

      console.log(`[API] All ${MAX_RETRIES} retries exhausted for ${config.url}`);
    }

    return Promise.reject(error);
  }
);

export default api;
