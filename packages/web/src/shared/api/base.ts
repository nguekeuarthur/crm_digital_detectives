import axios, { InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './token';

// Helper pour lire les cookies
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Instance publique pour l'authentification (sans intercepteurs de token/refresh)
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Instance principale pour les requêtes authentifiées
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Intercepteur CSRF partagé (Double Submit Cookie)
const csrfRequestInterceptor = async (config: InternalAxiosRequestConfig) => {
  const safeMethods = ['get', 'head', 'options', 'trace'];
  if (config.method && !safeMethods.includes(config.method.toLowerCase())) {
    let csrfToken = getCookie('csrfToken');
    
    // Si absent, on récupère le token via un GET rapide
    if (!csrfToken) {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/auth/csrf-token`,
          { withCredentials: true }
        );
        csrfToken = response.data.csrfToken;
      } catch (err) {
        console.error('Échec de la récupération du jeton CSRF:', err);
      }
    }
    
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
};

// Enregistrement de l'intercepteur CSRF sur les deux instances
api.interceptors.request.use(csrfRequestInterceptor);
publicApi.interceptors.request.use(csrfRequestInterceptor);

// Intercepteur pour ajouter le token JWT sur l'instance principale
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag pour éviter les refresh en parallèle
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur avec refresh automatique du token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        setAccessToken(null);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await publicApi.post('/auth/refresh', { refreshToken });

        setAccessToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        processQueue(null, data.accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        localStorage.removeItem('refreshToken');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
