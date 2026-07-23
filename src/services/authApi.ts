const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

interface SecurityQuestion { id: number; question: string }
interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: any;
  error?: string;
  details?: unknown;
  valid?: boolean;
  items?: SecurityQuestion[] | string[];
  message?: string;
  recoveryToken?: string;
  passwordResetToken?: string;
}

async function request<T = AuthResponse>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      credentials: 'include',
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the PeakFlix account server. Please try again later.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || (response.status === 404
      ? 'The PeakFlix account server is not configured for this website.'
      : 'Request failed.'));
  }
  return data as T;
}

export async function signUp(payload: Record<string, unknown>) {
  return request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getMe() {
  return request('/auth/profile', { method: 'POST' });
}

export async function getSecurityQuestions() {
  return request('/auth/security-questions', { method: 'GET' });
}

export async function signIn(payload: Record<string, unknown>) {
  return request('/auth/signin', { method: 'POST', body: JSON.stringify(payload) });
}

export async function forgotPassword(identifier: string) {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) });
}

export async function verifySecurityAnswer(recoveryToken: string, answer: string) {
  return request('/auth/verify-security-answer', { method: 'POST', body: JSON.stringify({ recoveryToken, answer }) });
}

export async function resetPassword(passwordResetToken: string, password: string, confirmPassword: string) {
  return request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ passwordResetToken, password, confirmPassword }) });
}

export async function updateProfile(updates: Record<string, unknown>) {
  return request('/auth/profile', { method: 'PUT', body: JSON.stringify(updates) });
}

export async function syncLibrary(kind: string, items: Array<Record<string, unknown>>) {
  return request('/library/sync', { method: 'POST', body: JSON.stringify({ kind, items }) });
}

export async function getUserLibrary(kind: string) {
  return request(`/library/${kind}`, { method: 'GET' });
}

export async function saveSearchHistory(searchText: string) {
  return request('/search/history', { method: 'POST', body: JSON.stringify({ searchText }) });
}

export async function getSearchHistory() {
  return request('/search/history', { method: 'GET' });
}

export async function logoutUser() {
  return request('/auth/logout', { method: 'POST' });
}
