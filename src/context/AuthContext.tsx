import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProfile, signIn, syncLibrary } from '../services/authApi';
import { getLibrary } from '../utils/library';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem('peakflix-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AuthValue {
  user: string | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('peakflix-auth-token');
    const storedUser = localStorage.getItem('peakflix-user');
    if (token && storedUser) {
      getProfile(token)
        .then((response) => {
          setUser(response.user?.username || response.user?.email || null);
        })
        .catch(() => {
          localStorage.removeItem('peakflix-auth-token');
          localStorage.removeItem('peakflix-user');
          setUser(null);
        });
      return;
    }
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { username?: string; email?: string };
        setUser(parsed.username || parsed.email || null);
      } catch {
        setUser(null);
      }
    }
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await signIn({ identifier, password });
      const token = response.token;
      const authUser = response.user;
      if (!token || !authUser) return false;
      localStorage.setItem('peakflix-auth-token', token);
      localStorage.setItem('peakflix-user', JSON.stringify(authUser));
      setUser(authUser.username || authUser.email || null);
      const localFavorites = getLibrary('favorites').map((entry) => ({ id: entry.id }));
      const localHistory = getLibrary('continueWatching').map((entry) => ({ id: entry.id, progressSeconds: 0, durationSeconds: 0, seasonNumber: 1, episodeNumber: 1 }));
      await syncLibrary('favorites', localFavorites, token);
      await syncLibrary('watch_history', localHistory, token);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('peakflix-auth-token');
    localStorage.removeItem('peakflix-user');
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
