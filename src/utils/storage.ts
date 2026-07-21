import type { WatchProgress } from '../types/media';

const USERS_KEY = 'cinevault-users';
const SESSION_KEY = 'cinevault-session';
const PROGRESS_KEY = 'cinevault-progress';

export interface User { username: string; password: string }

export function seedAdmin() {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  if (!users.some((u) => u.username === 'admin')) {
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, { username: 'admin', password: 'admin' }]));
  }
}

export function authenticate(username: string, password: string) {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const found = users.find((u) => u.username === username && u.password === password);
  if (found) localStorage.setItem(SESSION_KEY, found.username);
  return Boolean(found);
}

export const getSession = () => localStorage.getItem(SESSION_KEY);
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export function getProgress(username: string): WatchProgress[] {
  const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  return all[username] || [];
}

export function saveProgress(username: string, item: WatchProgress) {
  const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  const current: WatchProgress[] = all[username] || [];
  all[username] = [...current.filter((x) => x.mediaId !== item.mediaId), item];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}
