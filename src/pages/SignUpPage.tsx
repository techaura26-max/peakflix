import { LockKeyhole, Mail, MapPin, User, HelpCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { getSecurityQuestions, signUp } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES } from '../data/countries';

export function SignUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', country: '', securityQuestionId: '1', securityAnswer: '', language: 'en' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<Array<{ id: number; question: string }>>([]);

  useEffect(() => {
    getSecurityQuestions().then((result) => {
      if (Array.isArray(result.items) && result.items.length) {
        const nextQuestions = (result.items as Array<{ id: number; question: string }>);
        setQuestions(nextQuestions);
      }
    }).catch(() => undefined);
  }, []);

  const countries = useMemo(() => COUNTRIES.filter((country) => country.toLowerCase().includes(query.toLowerCase()) || !query), [query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await signUp({ ...form, country: form.country || query });
      signup(response.user || null);
      setSuccess('Account created successfully.');
      navigate('/');
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
            {questions.length ? questions.map((question) => <option key={question.id} value={question.id}>{question.question}</option>) : <option value="1">What was the name of your first pet?</option>}
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
