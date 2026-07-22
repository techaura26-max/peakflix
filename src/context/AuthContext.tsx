import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMe, signIn, syncLibrary, logoutUser } from '../services/authApi';
import { getLibrary } from '../utils/library';

interface AuthUserPayload {
  username?: string;
  email?: string;
}

interface AuthValue {
  user: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (authUser: AuthUserPayload | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getMe();
        setUser(response.user?.username || response.user?.email || null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await signIn({ identifier, password });
      const authUser = response.user;
      if (!authUser) return false;
      setUser(authUser.username || authUser.email || null);
      const localFavorites = getLibrary('favorites').map((entry) => ({ id: entry.id }));
      const localHistory = getLibrary('continueWatching').map((entry) => ({ id: entry.id, progressSeconds: 0, durationSeconds: 0, seasonNumber: 1, episodeNumber: 1 }));
      await syncLibrary('favorites', localFavorites);
      await syncLibrary('watch_history', localHistory);
      return true;
    } catch {
      return false;
    }
  };

  const signup = (authUser: AuthUserPayload | null) => {
    setUser(authUser?.username || authUser?.email || null);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // ignore and clear local state
    }
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
