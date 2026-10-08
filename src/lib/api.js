// Cliente HTTP del backend. El token JWT vive solo en memoria: al recargar la página hay que iniciar sesión de nuevo.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => { authToken = token; };

// Se invoca cuando el backend rechaza el token (expirado o inválido)
export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler; };

export async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && authToken) onUnauthorized?.();
  return res;
}
