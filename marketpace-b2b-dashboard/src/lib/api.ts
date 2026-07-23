import axios, { type AxiosError } from 'axios';
import type { ApiError } from './types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// El token se lee directamente del storage de Zustand (persistido por auth.store.ts)
// para evitar una dependencia circular entre el cliente API y el store.
const AUTH_STORAGE_KEY = 'marketplace-auth';

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Sesion invalida o expirada: se limpia el storage y se manda a login.
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje de error legible de una respuesta de la API (siempre string, nunca array crudo). */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join('. ') : data.message;
    }
    if (error.message) return error.message;
  }
  return 'Ocurrio un error inesperado. Intenta de nuevo.';
}
