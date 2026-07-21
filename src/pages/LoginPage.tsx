import { LockKeyhole, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(identifier, password);
    if (ok) {
      navigate('/');
    } else {
      setError(t('invalidLogin'));
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">PEAKFLIX MEMBER</span>
        <h1>{t('welcomeBack')}</h1>
        <p>Sign in with your email, username, or your saved account.</p>
        {error ? <p className="error">{error}</p> : null}
        <label>
          <span>{t('username')}</span>
          <div><Mail size={18} /><input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email or username" /></div>
        </label>
        <label>
          <span>{t('password')}</span>
          <div><LockKeyhole size={18} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        </label>
        <button className="primary-btn" disabled={loading}>{loading ? 'Signing in...' : t('signIn')}</button>
        <div className="chip-list" style={{ justifyContent: 'center', marginTop: 12 }}>
          <Link className="chip" to="/signup">Create account</Link>
          <Link className="chip" to="/forgot-password">Forgot password</Link>
        </div>
      </form>
    </div>
  );
}
