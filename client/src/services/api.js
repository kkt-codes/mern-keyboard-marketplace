import axios from 'axios';

/**
 * Centralized Axios instance for all API calls.
 * `withCredentials: true` is required so the browser attaches/accepts the
 * httpOnly `refreshToken` cookie set by the backend on /auth/login|register|refresh.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// The access token lives in memory (not in this module's exports as
// React state) so the request interceptor below can read the *latest* value
// synchronously on every request, without every page having to pass it in.
let accessToken = null;

/**
 * Updates the in-memory access token used by the request interceptor.
 * Called by AuthContext after login/register/refresh, and with `null` on logout.
 * @param {string|null} token
 */
export const setAccessToken = (token) => {
  accessToken = token;
};

// Attach the current access token to every outgoing request.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * The "Why": Access tokens expire after 15 minutes. Instead of forcing the
 * user to log in again, we intercept the 401 that results from an expired
 * token, silently exchange the httpOnly refresh cookie for a new access
 * token, and replay the original request exactly once.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);

        // Keep localStorage in sync so a page refresh doesn't lose the new token.
        const storedUser = JSON.parse(localStorage.getItem('userInfo') || 'null');
        if (storedUser) {
          storedUser.accessToken = data.accessToken;
          localStorage.setItem('userInfo', JSON.stringify(storedUser));
        }

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token is missing/expired: force a logout.
        setAccessToken(null);
        localStorage.removeItem('userInfo');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
