import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { supabase } from './supabase.js';
import { normalizeEmail, normalizeUsername, normalizeSearchText, validateIdentifier, validatePassword } from './validation.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET || 'dev-reset-secret-change-me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const COOKIE_NAME = 'peakflix-session';

app.use(helmet());
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json({ limit: '1mb' }));

const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-security-answer', authLimiter);
app.use('/api/auth/reset-password', resetLimiter);

const sendError = (res, status, message, details) => res.status(status).json({ ok: false, error: message, details });

const createToken = (user) => jwt.sign({ sub: user.id, username: user.username, email: user.email, purpose: 'session' }, JWT_SECRET, { expiresIn: '7d' });
const createResetToken = (user) => jwt.sign({ sub: user.id, purpose: 'password-reset' }, PASSWORD_RESET_SECRET, { expiresIn: '15m' });

const normalizeUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  country: row.country,
  language: row.language,
  security_question_id: row.security_question_id,
  created_at: row.created_at,
  session_version: row.session_version,
});

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
};

const getAuthenticatedUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  const cookieHeader = req.headers.cookie || '';
  const cookieMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (cookieMatch ? decodeURIComponent(cookieMatch[1]) : '');

  if (!token) throw new Error('Authentication required.');

  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.purpose !== 'session') throw new Error('Invalid token purpose.');

  const { data, error } = await supabase.from('users').select('*').eq('id', payload.sub).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Account not found.');
  return { payload, user: data };
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/auth/security-questions', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('security_questions').select('id, question').eq('is_active', true).order('id');
    if (error) {
      return res.json({ ok: true, items: [
        { id: 1, question: 'What was the name of your first pet?' },
        { id: 2, question: 'What city were you born in?' },
        { id: 3, question: 'What was the name of your first school?' },
        { id: 4, question: 'What is your favorite movie?' },
        { id: 5, question: 'What was your childhood nickname?' },
        { id: 6, question: 'What is the name of your favorite teacher?' },
        { id: 7, question: 'What is your favorite food?' },
        { id: 8, question: 'What was the model of your first car?' },
        { id: 9, question: 'What is your favorite book?' },
        { id: 10, question: 'What was the name of the street where you grew up?' },
      ] });
    }
    return res.json({ ok: true, items: data || [] });
  } catch (error) {
    return sendError(res, 500, 'Unable to load security questions.', error.message);
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, country, securityQuestionId, securityAnswer, language } = req.body || {};

    const trimmedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);
    const trimmedAnswer = String(securityAnswer || '').trim();

    if (!trimmedUsername || !normalizedEmail || !password || !confirmPassword || !country || !securityQuestionId || !trimmedAnswer) {
      return sendError(res, 400, 'All fields are required.');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.ok) return sendError(res, 400, passwordValidation.error);
    if (password !== confirmPassword) return sendError(res, 400, 'Passwords must match.');

    const identifierValidation = validateIdentifier(normalizedEmail);
    if (!identifierValidation.ok) return sendError(res, 400, identifierValidation.error);

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) return sendError(res, 400, 'Username must be between 3 and 30 characters.');
    if (String(country).trim().length < 2) return sendError(res, 400, 'Please choose a country.');
    if (!Number.isInteger(Number(securityQuestionId)) || Number(securityQuestionId) <= 0) return sendError(res, 400, 'Please select a valid security question.');

    const { data: allUsers, error: usersError } = await supabase.from('users').select('id, username, email');
    if (usersError) throw usersError;

    const existing = (allUsers || []).find((row) => row.username?.toLowerCase() === trimmedUsername.toLowerCase());
    if (existing) return sendError(res, 409, 'That username is already taken.');

    const emailTaken = (allUsers || []).find((row) => row.email?.toLowerCase() === normalizedEmail);
    if (emailTaken) return sendError(res, 409, 'That email is already registered.');

    const passwordHash = await bcrypt.hash(password.trim(), BCRYPT_ROUNDS);
    const answerHash = await bcrypt.hash(trimmedAnswer.toLowerCase(), BCRYPT_ROUNDS);

    const { data, error } = await supabase.from('users').insert({
      username: trimmedUsername,
      email: normalizedEmail,
      password_hash: passwordHash,
      country: String(country).trim(),
      security_question_id: Number(securityQuestionId),
      security_answer_hash: answerHash,
      language: language || 'en',
      is_active: true,
      email_verified: false,
      session_version: 1,
      password_changed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single();

    if (error) throw error;

    const token = createToken(data);
    setAuthCookie(res, token);
    return res.json({ ok: true, token, user: normalizeUser(data) });
  } catch (error) {
    return sendError(res, 500, 'Could not create account.', error.message);
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return sendError(res, 400, 'Email/username and password are required.');

    const normalizedIdentifier = normalizeEmail(normalizeUsername(identifier));
    const { data: allUsers, error: usersError } = await supabase.from('users').select('*');
    if (usersError) throw usersError;

    const user = (allUsers || []).find((row) => row.username?.toLowerCase() === normalizedIdentifier.toLowerCase() || row.email?.toLowerCase() === normalizedIdentifier);
    if (!user) return sendError(res, 401, 'Invalid credentials.');

    const match = await bcrypt.compare(String(password).trim(), user.password_hash);
    if (!match) return sendError(res, 401, 'Invalid credentials.');

    if (!user.is_active) return sendError(res, 403, 'This account is inactive.');

    const updatedUser = await supabase.from('users').update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', user.id).select('*').single();
    const token = createToken(updatedUser.data || user);
    setAuthCookie(res, token);
    return res.json({ ok: true, token, user: normalizeUser(updatedUser.data || user) });
  } catch (error) {
    return sendError(res, 500, 'Could not sign in.', error.message);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return sendError(res, 400, 'Please provide your email or username.');

    const normalizedIdentifier = normalizeEmail(normalizeUsername(identifier));
    const { data: allUsers, error: usersError } = await supabase.from('users').select('id, username, email, security_question_id');
    if (usersError) throw usersError;

    const user = (allUsers || []).find((row) => row.username?.toLowerCase() === normalizedIdentifier.toLowerCase() || row.email?.toLowerCase() === normalizedIdentifier);
    if (!user) {
      return res.json({ ok: true, message: 'If that account exists, recovery details will be provided.' });
    }

    return res.json({ ok: true, user: { id: user.id, username: user.username, email: user.email, security_question_id: user.security_question_id } });
  } catch (error) {
    return sendError(res, 500, 'Unable to recover account.', error.message);
  }
});

app.post('/api/auth/verify-security-answer', async (req, res) => {
  try {
    const { userId, answer } = req.body || {};
    if (!userId || !answer) return sendError(res, 400, 'Security answer is required.');

    const { data, error } = await supabase.from('users').select('id, security_answer_hash').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!data) return sendError(res, 404, 'Account not found.');

    const match = await bcrypt.compare(String(answer).trim().toLowerCase(), data.security_answer_hash);
    if (!match) return res.json({ ok: true, valid: false });

    const resetToken = createResetToken({ id: data.id });
    return res.json({ ok: true, valid: true, resetToken, userId: data.id });
  } catch (error) {
    return sendError(res, 500, 'Could not verify security answer.', error.message);
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { userId, password, token } = req.body || {};
    if (!userId || !password || !token) return sendError(res, 400, 'A reset token and new password are required.');

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.ok) return sendError(res, 400, passwordValidation.error);

    const payload = jwt.verify(token, PASSWORD_RESET_SECRET);
    if (payload.sub !== userId || payload.purpose !== 'password-reset') return sendError(res, 401, 'Invalid reset token.');

    const passwordHash = await bcrypt.hash(String(password).trim(), BCRYPT_ROUNDS);
    const { error } = await supabase.from('users').update({
      password_hash: passwordHash,
      password_changed_at: new Date().toISOString(),
      session_version: 1,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) throw error;

    return res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (error) {
    return sendError(res, 500, 'Could not reset password.', error.message);
  }
});

app.post('/api/auth/profile', async (req, res) => {
  try {
    const { user } = await getAuthenticatedUser(req);
    return res.json({ ok: true, user: normalizeUser(user) });
  } catch (error) {
    return sendError(res, 401, error.message || 'Invalid or expired token.');
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const { user } = await getAuthenticatedUser(req);
    const { language, country } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (language) updates.language = language;
    if (country) updates.country = country;

    const { data, error } = await supabase.from('users').update(updates).eq('id', user.id).select('*').single();
    if (error) throw error;

    return res.json({ ok: true, user: normalizeUser(data) });
  } catch (error) {
    return sendError(res, 401, error.message || 'Invalid or expired token.');
  }
});

app.post('/api/library/sync', async (req, res) => {
  try {
    const { user } = await getAuthenticatedUser(req);
    const { kind, items } = req.body || {};
    if (!kind || !Array.isArray(items)) return sendError(res, 400, 'Invalid payload.');

    if (kind === 'favorites') {
      const records = items.map((item) => ({ user_id: user.id, movie_id: String(item.id), media_type: item.mediaType || 'movie', created_at: new Date().toISOString() }));
      const { error: deleteError } = await supabase.from('favorites').delete().eq('user_id', user.id);
      if (deleteError) throw deleteError;
      if (records.length) {
        const { error: insertError } = await supabase.from('favorites').insert(records);
        if (insertError) throw insertError;
      }
      return res.json({ ok: true });
    }

    if (kind === 'watch_history') {
      const existingRows = await supabase.from('watch_history').select('*').eq('user_id', user.id);
      if (existingRows.error) throw existingRows.error;
      const rows = existingRows.data || [];
      for (const item of items) {
        const mediaType = item.seasonNumber || item.episodeNumber ? 'tv' : 'movie';
        const key = `${String(item.id)}:${mediaType}:${item.seasonNumber || 0}:${item.episodeNumber || 0}`;
        const existing = rows.find((row) => `${row.movie_id}:${row.media_type}:${row.season_number || 0}:${row.episode_number || 0}` === key);
        if (existing) {
          const { error } = await supabase.from('watch_history').update({
            progress_seconds: Number(item.progressSeconds || 0),
            duration_seconds: Number(item.durationSeconds || 0),
            season_number: item.seasonNumber || null,
            episode_number: item.episodeNumber || null,
            media_type: mediaType,
            completed: Boolean(item.completed),
            last_watched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('watch_history').insert({
            user_id: user.id,
            movie_id: String(item.id),
            season_number: item.seasonNumber || null,
            episode_number: item.episodeNumber || null,
            progress_seconds: Number(item.progressSeconds || 0),
            duration_seconds: Number(item.durationSeconds || 0),
            media_type: mediaType,
            completed: Boolean(item.completed),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_watched_at: new Date().toISOString(),
          });
          if (error) throw error;
        }
      }
      return res.json({ ok: true });
    }

    return sendError(res, 400, 'Unsupported library kind.');
  } catch (error) {
    return sendError(res, 500, 'Could not sync library.', error.message);
  }
});

app.get('/api/library/:kind', async (req, res) => {
  try {
    const { user } = await getAuthenticatedUser(req);
    const { kind } = req.params;
    if (kind === 'favorites') {
      const { data, error } = await supabase.from('favorites').select('movie_id, media_type').eq('user_id', user.id);
      if (error) throw error;
      return res.json({ ok: true, items: data.map((entry) => ({ id: entry.movie_id, mediaType: entry.media_type })) });
    }

    if (kind === 'watch_history') {
      const { data, error } = await supabase.from('watch_history').select('*').eq('user_id', user.id).order('last_watched_at', { ascending: false });
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
    const { user } = await getAuthenticatedUser(req);
    const { searchText } = req.body || {};
    const normalized = normalizeSearchText(searchText);
    if (!normalized) return sendError(res, 400, 'Search text is required.');

    const { data, error } = await supabase.from('search_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;

    const uniqueEntries = data.filter((entry, index, arr) => arr.findIndex((candidate) => candidate.search_text.toLowerCase() === entry.search_text.toLowerCase()) === index);
    const filtered = uniqueEntries.filter((entry) => entry.search_text.toLowerCase() !== normalized.toLowerCase());
    const nextEntries = [{ user_id: user.id, search_text: normalized, created_at: new Date().toISOString() }, ...filtered].slice(0, 5);

    const { error: deleteError } = await supabase.from('search_history').delete().eq('user_id', user.id);
    if (deleteError) throw deleteError;

    if (nextEntries.length) {
      const { error: insertError } = await supabase.from('search_history').insert(nextEntries);
      if (insertError) throw insertError;
    }

    return res.json({ ok: true, items: nextEntries.map((entry) => entry.search_text) });
  } catch (error) {
    return sendError(res, 500, 'Could not save search history.', error.message);
  }
});

app.get('/api/search/history', async (req, res) => {
  try {
    const { user } = await getAuthenticatedUser(req);
    const { data, error } = await supabase.from('search_history').select('search_text').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
    if (error) throw error;
    return res.json({ ok: true, items: data.map((entry) => entry.search_text) });
  } catch (error) {
    return sendError(res, 500, 'Could not load search history.', error.message);
  }
});

app.listen(PORT, () => console.log(`PeakFlix auth server listening on ${PORT}`));
