const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface AuthResponse { ok: boolean; token?: string; user?: any; error?: string; details?: unknown; valid?: boolean; items?: string[]; message?: string }

async function request<T = AuthResponse>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Request failed.');
  }
  return data as T;
}

export async function signUp(payload: Record<string, unknown>) {
  return request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
}

export async function signIn(payload: Record<string, unknown>) {
  return request('/auth/signin', { method: 'POST', body: JSON.stringify(payload) });
}

export async function forgotPassword(identifier: string) {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) });
}

export async function verifySecurityAnswer(userId: string, answer: string) {
  return request('/auth/verify-security-answer', { method: 'POST', body: JSON.stringify({ userId, answer }) });
}

export async function resetPassword(userId: string, password: string) {
  return request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ userId, password }) });
}

export async function getProfile(token: string) {
  return request('/auth/profile', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
}

export async function updateProfile(token: string, updates: Record<string, unknown>) {
  return request('/auth/profile', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
}

export async function syncLibrary(kind: string, items: Array<Record<string, unknown>>, token: string) {
  return request('/library/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind, items }) });
}

export async function getUserLibrary(kind: string, token: string) {
  return request(`/library/${kind}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
}

export async function saveSearchHistory(searchText: string, token: string) {
  return request('/search/history', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ searchText }) });
}

export async function getSearchHistory(token: string) {
  return request('/search/history', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
}
