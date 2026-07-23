import { Heart, History, List, LogOut, Sparkles, Globe2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMe, updateProfile, syncLibrary, getUserLibrary } from '../services/authApi';
import { getLibrary } from '../utils/library';

interface UserProfile { id: string; username: string; email: string; country?: string; language?: string }

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [language, setLanguage] = useState(localStorage.getItem('peakflix-language') || 'en');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, favoritesData, historyData] = await Promise.all([
          getMe(),
          getUserLibrary('favorites'),
          getUserLibrary('watch_history'),
        ]);
        setProfile(profileData.user);
        setFavorites((favoritesData.items || []).map((entry: any) => String(entry.id)));
        setHistory(historyData.items || []);
      } catch (e: any) {
        setError(e.message || 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, user]);

  const saveLanguage = async (value: string) => {
    setLanguage(value);
    localStorage.setItem('peakflix-language', value);
    try {
      await updateProfile({ language: value });
    } catch (e) {
      setError('Language preference could not be synced.');
    }
  };

  const syncData = async () => {
    try {
      const localFavorites = getLibrary('favorites').map((entry) => ({
        id: entry.id,
        mediaType: entry.tmdbType || (entry.type === 'movie' ? 'movie' : 'tv'),
      }));
      const localHistory = getLibrary('continueWatching').map((entry) => ({
        id: entry.id,
        mediaType: entry.tmdbType || (entry.type === 'movie' ? 'movie' : 'tv'),
        progressSeconds: 0,
        durationSeconds: 0,
      }));
      await syncLibrary('favorites', localFavorites);
      await syncLibrary('watch_history', localHistory);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Sync failed.');
    }
  };

  const summary = useMemo(() => [
    { label: 'Favorites', value: favorites.length, icon: Heart },
    { label: 'Watch history', value: history.length, icon: History },
    { label: 'Lists', value: 0, icon: List },
  ], [favorites.length, history.length]);

  if (loading) return <div className="page-shell"><div className="empty-state"><h2>Loading profile...</h2></div></div>;

  return (
    <div className="page-shell">
      <div className="login-card" style={{ maxWidth: 780 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div>
            <span className="eyebrow">PROFILE</span>
            <h1>{profile?.username || user || 'Member'}</h1>
            <p>{profile?.email}</p>
          </div>
          <button className="secondary-btn" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <div className="chip-list" style={{ marginTop: 18 }}>
          {summary.map((item) => <div key={item.label} className="chip">{item.label}: {item.value}</div>)}
        </div>
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <label>
            <span>Preferred language</span>
            <div><Globe2 size={18} /><select value={language} onChange={(e) => saveLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
              <option value="fr">French</option>
              <option value="it">Italian</option>
              <option value="de">German</option>
            </select></div>
          </label>
          <button className="primary-btn" onClick={syncData}><Sparkles size={18} /> Sync library to account</button>
        </div>
      </div>
    </div>
  );
}
