import { LockKeyhole, Mail, MapPin, User, HelpCircle, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../services/authApi';
import { useAuth } from '../context/AuthContext';

const SECURITY_QUESTIONS = [
  { id: 1, label: 'What was the name of your first pet?' },
  { id: 2, label: 'What city were you born in?' },
  { id: 3, label: 'What was the name of your first school?' },
  { id: 4, label: 'What is your favorite movie?' },
  { id: 5, label: 'What is your favorite childhood memory?' },
  { id: 6, label: 'What was your childhood nickname?' },
  { id: 7, label: 'What is the name of your favorite teacher?' },
  { id: 8, label: 'What is your favorite food?' },
  { id: 9, label: 'What was your first car model?' },
  { id: 10, label: 'What is your favorite book?' },
];

export function SignUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', country: '', securityQuestionId: '1', securityAnswer: '', language: 'en' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');

  const countries = useMemo(() => [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Spain', 'Italy', 'Japan', 'Brazil', 'Mexico', 'Turkey', 'Egypt', 'South Africa', 'Saudi Arabia', 'United Arab Emirates', 'Nigeria', 'Kenya', 'Netherlands', 'Sweden', 'Norway', 'Finland', 'Poland', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Indonesia', 'Malaysia', 'Philippines', 'Singapore', 'New Zealand', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Thailand', 'Vietnam', 'South Korea', 'China', 'Russia', 'Ukraine', 'Romania', 'Greece', 'Portugal', 'Ireland', 'Belgium', 'Austria', 'Czech Republic', 'Hungary', 'Slovakia', 'Denmark', 'Israel', 'Morocco', 'Algeria', 'Tunisia', 'Jordan', 'Lebanon', 'Iraq', 'Qatar', 'Oman', 'Kuwait', 'Bahrain', 'Zimbabwe', 'Botswana', 'Ghana', 'Tanzania', 'Nepal', 'Cambodia', 'Laos', 'Myanmar', 'Mongolia', 'Kazakhstan', 'Uzbekistan', 'Azerbaijan', 'Armenia', 'Georgia', 'Serbia', 'Croatia', 'Slovenia', 'Bosnia and Herzegovina', 'Albania', 'North Macedonia', 'Malta', 'Cyprus', 'Luxembourg', 'Iceland'
  ].filter((country) => country.toLowerCase().includes(query.toLowerCase()) || !query), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await signUp({ ...form, country: form.country || query });
      const token = result.token;
      if (token) {
        localStorage.setItem('peakflix-auth-token', token);
        localStorage.setItem('peakflix-user', JSON.stringify(result.user));
        login(form.username, form.password);
        setSuccess('Account created successfully.');
        navigate('/');
      }
    } catch (e: any) {
      setError(e.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} style={{ maxWidth: 560 }}>
        <span className="eyebrow">PEAKFLIX MEMBER</span>
        <h1>Create your account</h1>
        <p>Join PeakFlix and sync your favorites, watch history, and custom lists.</p>
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        <label>
          <span>{t('username') || 'Username'}</span>
          <div><User size={18} /><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
        </label>
        <label>
          <span>Email</span>
          <div><Mail size={18} /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        </label>
        <label>
          <span>Password</span>
          <div><LockKeyhole size={18} /><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        </label>
        <label>
          <span>Confirm Password</span>
          <div><LockKeyhole size={18} /><input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required /></div>
        </label>
        <label>
          <span>Country</span>
          <div><MapPin size={18} /><input value={form.country || query} onChange={(e) => { setQuery(e.target.value); setForm({ ...form, country: e.target.value }); }} placeholder="Search country" /></div>
          {countries.length ? <div className="chip-list" style={{ marginTop: 8 }}>
            {countries.slice(0, 8).map((country) => <button key={country} type="button" className="chip" onClick={() => setForm({ ...form, country })}>{country}</button>)}
          </div> : null}
        </label>
        <label>
          <span>Security Question</span>
          <div><HelpCircle size={18} /><select value={form.securityQuestionId} onChange={(e) => setForm({ ...form, securityQuestionId: e.target.value })}>
            {SECURITY_QUESTIONS.map((question) => <option key={question.id} value={question.id}>{question.label}</option>)}
          </select></div>
        </label>
        <label>
          <span>Security Answer</span>
          <div><Sparkles size={18} /><input value={form.securityAnswer} onChange={(e) => setForm({ ...form, securityAnswer: e.target.value })} required /></div>
        </label>
        <button className="primary-btn" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        <p className="muted" style={{ textAlign: 'center' }}><Link to="/login">Already have an account? Sign in</Link></p>
      </form>
    </div>
  );
}
