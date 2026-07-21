import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { supabase } from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);

const sendError = (res, status, message, details) => res.status(status).json({ ok: false, error: message, details });

const createToken = (user) => jwt.sign({ sub: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

const normalizeUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  country: row.country,
  language: row.language,
  security_question_id: row.security_question_id,
  created_at: row.created_at,
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, country, securityQuestionId, securityAnswer, language } = req.body || {};

    if (!username || !email || !password || !confirmPassword || !country || !securityQuestionId || !securityAnswer) {
      return sendError(res, 400, 'All fields are required.');
    }

    if (password.length < 8 || password !== confirmPassword) {
      return sendError(res, 400, 'Password must be at least 8 characters and match confirmation.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 400, 'Please enter a valid email address.');
    }

    const usernameExists = await supabase.from('users').select('id').eq('username', username).maybeSingle();
    if (usernameExists.error) throw usernameExists.error;
    if (usernameExists.data) return sendError(res, 409, 'That username is already taken.');

    const emailExists = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (emailExists.error) throw emailExists.error;
    if (emailExists.data) return sendError(res, 409, 'That email is already registered.');

    const passwordHash = await bcrypt.hash(password, 12);
    const answerHash = await bcrypt.hash(String(securityAnswer).trim().toLowerCase(), 12);

    const { data, error } = await supabase.from('users').insert({
      username,
      email,
      password_hash: passwordHash,
      country,
      security_question_id: Number(securityQuestionId),
      security_answer_hash: answerHash,
      language: language || 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single();

    if (error) throw error;

    const token = createToken(data);
    return res.json({ ok: true, token, user: normalizeUser(data) });
  } catch (error) {
    return sendError(res, 500, 'Could not create account.', error.message);
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return sendError(res, 400, 'Email/username and password are required.');

    const { data, error } = await supabase.from('users').select('*').or(`email.eq.${identifier},username.eq.${identifier}`).maybeSingle();
    if (error) throw error;
    if (!data) return sendError(res, 401, 'Invalid credentials.');

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) return sendError(res, 401, 'Invalid credentials.');

    const token = createToken(data);
    return res.json({ ok: true, token, user: normalizeUser(data) });
  } catch (error) {
    return sendError(res, 500, 'Could not sign in.', error.message);
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return sendError(res, 400, 'Please provide your email or username.');

    const { data, error } = await supabase.from('users').select('id, username, email, security_question_id, security_answer_hash').or(`email.eq.${identifier},username.eq.${identifier}`).maybeSingle();
    if (error) throw error;
    if (!data) return sendError(res, 404, 'No account found for that identifier.');

    return res.json({ ok: true, user: { id: data.id, username: data.username, email: data.email, security_question_id: data.security_question_id } });
  } catch (error) {
    return sendError(res, 500, 'Unable to recover account.', error.message);
  }
});

app.post('/api/auth/verify-security-answer', async (req, res) => {
  try {
    const { userId, answer } = req.body || {};
    if (!userId || !answer) return sendError(res, 400, 'Security answer is required.');

    const { data, error } = await supabase.from('users').select('security_answer_hash').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!data) return sendError(res, 404, 'Account not found.');

    const match = await bcrypt.compare(String(answer).trim().toLowerCase(), data.security_answer_hash);
    return res.json({ ok: true, valid: match });
  } catch (error) {
    return sendError(res, 500, 'Could not verify security answer.', error.message);
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { userId, password } = req.body || {};
    if (!userId || !password) return sendError(res, 400, 'New password is required.');
    if (password.length < 8) return sendError(res, 400, 'New password must be at least 8 characters.');

    const passwordHash = await bcrypt.hash(password, 12);
    const { error } = await supabase.from('users').update({ password_hash: passwordHash, updated_at: new Date().toISOString() }).eq('id', userId);
    if (error) throw error;

    return res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (error) {
    return sendError(res, 500, 'Could not reset password.', error.message);
  }
});

app.post('/api/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return sendError(res, 401, 'Authentication required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const { data, error } = await supabase.from('users').select('*').eq('id', payload.sub).maybeSingle();
    if (error) throw error;
    if (!data) return sendError(res, 404, 'Account not found.');

    return res.json({ ok: true, user: normalizeUser(data) });
  } catch (error) {
    return sendError(res, 401, 'Invalid or expired token.', error.message);
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return sendError(res, 401, 'Authentication required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const { language, country } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (language) updates.language = language;
    if (country) updates.country = country;

    const { data, error } = await supabase.from('users').update(updates).eq('id', payload.sub).select('*').single();
    if (error) throw error;

    return res.json({ ok: true, user: normalizeUser(data) });
  } catch (error) {
    return sendError(res, 401, 'Invalid or expired token.', error.message);
  }
});

app.post('/api/library/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return sendError(res, 401, 'Authentication required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const { kind, items } = req.body || {};
    if (!kind || !Array.isArray(items)) return sendError(res, 400, 'Invalid payload.');

    const table = kind === 'favorites' ? 'favorites' : kind === 'watch_history' ? 'watch_history' : null;
    if (!table) return sendError(res, 400, 'Unsupported library kind.');

    if (table === 'favorites') {
      const { error: deleteError } = await supabase.from('favorites').delete().eq('user_id', payload.sub);
      if (deleteError) throw deleteError;
      const inserts = items.map((item) => ({ user_id: payload.sub, movie_id: item.id, created_at: new Date().toISOString() }));
      if (inserts.length) {
        const { error: insertError } = await supabase.from('favorites').insert(inserts);
        if (insertError) throw insertError;
      }
    }

    if (table === 'watch_history') {
      const { error: deleteError } = await supabase.from('watch_history').delete().eq('user_id', payload.sub);
      if (deleteError) throw deleteError;
      const inserts = items.map((item) => ({
        user_id: payload.sub,
        movie_id: item.id,
        season_number: item.seasonNumber || null,
        episode_number: item.episodeNumber || null,
        progress_seconds: item.progressSeconds || 0,
        duration_seconds: item.durationSeconds || 0,
        last_watched_at: new Date().toISOString(),
      }));
      if (inserts.length) {
        const { error: insertError } = await supabase.from('watch_history').insert(inserts);
        if (insertError) throw insertError;
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    return sendError(res, 500, 'Could not sync library.', error.message);
  }
});

app.get('/api/library/:kind', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return sendError(res, 401, 'Authentication required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const { kind } = req.params;
    if (kind === 'favorites') {
      const { data, error } = await supabase.from('favorites').select('movie_id').eq('user_id', payload.sub);
      if (error) throw error;
      return res.json({ ok: true, items: data.map((entry) => entry.movie_id) });
    }

    if (kind === 'watch_history') {
      const { data, error } = await supabase.from('watch_history').select('*').eq('user_id', payload.sub).order('last_watched_at', { ascending: false });
      if (error) throw error;
      return res.json({ ok: true, items: data });
    }

    return sendError(res, 400, 'Unsupported library kind.');
  } catch (error) {
    return sendError(res, 500, 'Could not load library.', error.message);
  }
});

app.post('/api/search/history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return sendError(res, 401, 'Authentication required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const { searchText } = req.body || {};
    if (!searchText) return sendError(res, 400, 'Search text is required.');

    const { error } = await supabase.from('search_history').insert({ user_id: payload.sub, search_text: searchText, created_at: new Date().toISOString() });
    if (error) throw error;

    const { data: historyData, historyError } = await supabase.from('search_history').select('search_text').eq('user_id', payload.sub).order('created_at', { ascending: false }).limit(5);
    if (historyError) throw historyError;
    return res.json({ ok: true, items: historyData.map((entry) => entry.search_text) });
  } catch (error) {
    return sendError(res, 500, 'Could not save search history.', error.message);
  }
});

app.get('/api/search/history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return sendError(res, 401, 'Authentication required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const { data, error } = await supabase.from('search_history').select('search_text').eq('user_id', payload.sub).order('created_at', { ascending: false }).limit(5);
    if (error) throw error;
    return res.json({ ok: true, items: data.map((entry) => entry.search_text) });
  } catch (error) {
    return sendError(res, 500, 'Could not load search history.', error.message);
  }
});

app.listen(PORT, () => console.log(`PeakFlix auth server listening on ${PORT}`));
