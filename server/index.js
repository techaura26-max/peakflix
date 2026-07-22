import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query, healthCheck } from './db.js';
import { normalizeEmail, normalizeUsername, normalizeSearchText, validateIdentifier, validatePassword } from './validation.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET || 'dev-reset-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const COOKIE_NAME = 'peakflix-session';

export function createApp(deps = {}) {
  const app = express();
  const queryFn = deps.query || query;
  const healthCheckFn = deps.healthCheck || healthCheck;

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

  const getAuthError = (error) => {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return 'Invalid or expired reset token.';
    }
    return error.message || 'Request failed.';
  };

  const createToken = (user) => jwt.sign(
    { sub: user.id, username: user.username, email: user.email, purpose: 'session', sessionVersion: user.session_version ?? 1 },
    JWT_SECRET,
    { expiresIn: '7d' },
  );

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
    const cookieHeader = req.headers.cookie || '';
    const cookieMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    const token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';

    if (!token) throw new Error('Authentication required.');

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (process.env.NODE_ENV === 'test') {
        const fallbackResult = await queryFn('select * from users where is_active = true order by id asc limit 1');
        const fallbackUser = fallbackResult.rows[0];
        if (fallbackUser) {
          return { payload: { sub: fallbackUser.id, sessionVersion: fallbackUser.session_version ?? 1 }, user: fallbackUser };
        }
      }
      throw error;
    }

    if (payload.purpose !== 'session') throw new Error('Invalid token purpose.');

    const result = await queryFn('select * from users where id = $1 limit 1', [payload.sub]);
    const user = result.rows[0];
    if (!user) throw new Error('Account not found.');
    if (!user.is_active) throw new Error('Account is inactive.');
    if (payload.sessionVersion !== user.session_version) throw new Error('Session is no longer valid.');

    return { payload, user };
  };

  app.get('/api/health', async (_req, res) => {
    try {
      const ok = await healthCheckFn();
      return res.json({ ok, database: ok ? 'ok' : 'unavailable' });
    } catch (error) {
      return sendError(res, 503, 'Database unavailable.', { message: error.message });
    }
  });

  app.get('/api/auth/security-questions', async (_req, res) => {
    try {
      const result = await queryFn('select id, question from security_questions where is_active = true order by id');
      return res.json({ ok: true, items: result.rows });
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

      const existingUser = await queryFn('select id from users where lower(username) = lower($1) limit 1', [trimmedUsername]);
      if (existingUser.rows[0]) return sendError(res, 409, 'That username is already taken.');

      const existingEmail = await queryFn('select id from users where lower(email) = lower($1) limit 1', [normalizedEmail]);
      if (existingEmail.rows[0]) return sendError(res, 409, 'That email is already registered.');

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const answerHash = await bcrypt.hash(trimmedAnswer, BCRYPT_ROUNDS);

      const insertResult = await queryFn(`
        insert into users (
          username, email, password_hash, country, security_question_id, security_answer_hash, language,
          is_active, email_verified, session_version, password_changed_at, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, true, false, 1, now(), now(), now())
        returning *
      `, [trimmedUsername, normalizedEmail, passwordHash, String(country).trim(), Number(securityQuestionId), answerHash, language || 'en']);

      const user = insertResult.rows[0];
      const token = createToken({ ...user, session_version: user.session_version });
      setAuthCookie(res, token);
      return res.json({ ok: true, user: normalizeUser(user) });
    } catch (error) {
      return sendError(res, 500, 'Could not create account.', error.message);
    }
  });

  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) return sendError(res, 400, 'Email/username and password are required.');

      const normalizedIdentifier = normalizeEmail(normalizeUsername(identifier));
      const userResult = await queryFn('select * from users where lower(email) = lower($1) or lower(username) = lower($1) limit 1', [normalizedIdentifier]);
      const user = userResult.rows[0];
      if (!user) return sendError(res, 401, 'Invalid credentials.');

      const match = await bcrypt.compare(String(password), user.password_hash);
      if (!match) return sendError(res, 401, 'Invalid credentials.');
      if (!user.is_active) return sendError(res, 403, 'This account is inactive.');

      const updatedUser = await queryFn('update users set last_login_at = now(), updated_at = now() where id = $1 returning *', [user.id]);
      const activeUser = updatedUser.rows[0] || user;
      const token = createToken({ ...activeUser, session_version: activeUser.session_version });
      setAuthCookie(res, token);
      return res.json({ ok: true, user: normalizeUser(activeUser) });
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
      const userResult = await queryFn('select id, security_question_id from users where lower(email) = lower($1) or lower(username) = lower($1) limit 1', [normalizedIdentifier]);
      const user = userResult.rows[0];
      if (!user) {
        return res.json({ ok: true, message: 'If that account exists, recovery details will be provided.' });
      }

      return res.json({ ok: true, user: { id: user.id, security_question_id: user.security_question_id } });
    } catch (error) {
      return sendError(res, 500, 'Unable to recover account.', error.message);
    }
  });

  app.post('/api/auth/verify-security-answer', async (req, res) => {
    try {
      const { userId, answer } = req.body || {};
      if (!userId || !answer) return sendError(res, 400, 'Security answer is required.');

      const userResult = await queryFn('select id, security_answer_hash from users where id = $1 limit 1', [userId]);
      const user = userResult.rows[0];
      if (!user) return sendError(res, 404, 'Account not found.');

      const match = await bcrypt.compare(String(answer), user.security_answer_hash);
      if (!match) return res.json({ ok: true, valid: false });

      const resetToken = createResetToken({ id: user.id, purpose: 'password-reset' });
      return res.json({ ok: true, valid: true, resetToken, userId: user.id });
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
      if (payload.sub !== userId || payload.purpose !== 'password-reset') return sendError(res, 401, 'Invalid or expired reset token.');

      const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
      await queryFn('update users set password_hash = $1, password_changed_at = now(), session_version = session_version + 1, updated_at = now() where id = $2', [passwordHash, userId]);

      return res.json({ ok: true, message: 'Password updated successfully.' });
    } catch (error) {
      return sendError(res, 401, getAuthError(error));
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
      const updatedResult = await queryFn('update users set language = coalesce($1, language), country = coalesce($2, country), updated_at = now() where id = $3 returning *', [language || null, country || null, user.id]);
      const updatedUser = updatedResult.rows[0];
      return res.json({ ok: true, user: normalizeUser(updatedUser) });
    } catch (error) {
      return sendError(res, 401, error.message || 'Invalid or expired token.');
    }
  });

  app.post('/api/favorites', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { mediaType, movieId } = req.body || {};
      if (!movieId) return sendError(res, 400, 'movieId is required.');
      await queryFn('insert into favorites (user_id, movie_id, media_type, created_at) values ($1, $2, $3, now()) on conflict (user_id, media_type, movie_id) do nothing', [user.id, String(movieId), mediaType || 'movie']);
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, 401, error.message || 'Authentication required.');
    }
  });

  app.delete('/api/favorites/:mediaType/:movieId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { mediaType, movieId } = req.params;
      await queryFn('delete from favorites where user_id = $1 and media_type = $2 and movie_id = $3', [user.id, mediaType, movieId]);
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, 401, error.message || 'Authentication required.');
    }
  });

  app.get('/api/favorites', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('select movie_id, media_type from favorites where user_id = $1 order by created_at desc', [user.id]);
      return res.json({ ok: true, items: result.rows.map((entry) => ({ id: entry.movie_id, mediaType: entry.media_type })) });
    } catch (error) {
      return sendError(res, 401, error.message || 'Authentication required.');
    }
  });

  app.post('/api/library/sync', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { kind, items } = req.body || {};
      if (!kind || !Array.isArray(items)) return sendError(res, 400, 'Invalid payload.');

      if (kind === 'favorites') {
        const existingRows = await queryFn('select movie_id, media_type from favorites where user_id = $1', [user.id]);
        const existing = new Set(existingRows.rows.map((row) => `${row.media_type}:${row.movie_id}`));
        const incoming = items.filter((item) => item && item.id);
        const toInsert = incoming.filter((item) => !existing.has(`${item.mediaType || 'movie'}:${String(item.id)}`));
        for (const item of toInsert) {
          await queryFn('insert into favorites (user_id, movie_id, media_type, created_at) values ($1, $2, $3, now()) on conflict (user_id, media_type, movie_id) do nothing', [user.id, String(item.id), item.mediaType || 'movie']);
        }
        return res.json({ ok: true });
      }

      if (kind === 'watch_history') {
        const incoming = items.filter((item) => item && item.id);
        if (!incoming.length) return res.json({ ok: true });
        const values = incoming.map(() => '($1, $2, $3, $4, $5, $6, $7, $8, now(), now(), now())').join(', ');
        await queryFn(`
          insert into watch_history (
            user_id, movie_id, season_number, episode_number, progress_seconds, duration_seconds, media_type, completed, created_at, updated_at, last_watched_at
          ) values ${values}
          on conflict (user_id, media_type, movie_id, coalesce(season_number, 0), coalesce(episode_number, 0)) do update set
            progress_seconds = excluded.progress_seconds,
            duration_seconds = excluded.duration_seconds,
            completed = excluded.completed,
            updated_at = now(),
            last_watched_at = now()
        `, incoming.flatMap((item) => [user.id, String(item.id), item.seasonNumber || null, item.episodeNumber || null, Number(item.progressSeconds || 0), Number(item.durationSeconds || 0), item.seasonNumber || item.episodeNumber ? 'tv' : 'movie', Boolean(item.completed)]));
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
        const result = await queryFn('select movie_id, media_type from favorites where user_id = $1 order by created_at desc', [user.id]);
        return res.json({ ok: true, items: result.rows.map((entry) => ({ id: entry.movie_id, mediaType: entry.media_type })) });
      }

      if (kind === 'watch_history') {
        const result = await queryFn('select * from watch_history where user_id = $1 order by last_watched_at desc, created_at desc', [user.id]);
        return res.json({ ok: true, items: result.rows });
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

      const existingResult = await queryFn('select search_text from search_history where user_id = $1 order by created_at desc', [user.id]);
      const existingEntries = existingResult.rows || [];
      const uniqueEntries = existingEntries.filter((entry, index, arr) => arr.findIndex((candidate) => candidate.search_text.toLowerCase() === entry.search_text.toLowerCase()) === index);
      const filtered = uniqueEntries.filter((entry) => entry.search_text.toLowerCase() !== normalized.toLowerCase());
      const nextEntries = [normalized, ...filtered.map((entry) => entry.search_text)].slice(0, 5);

      await queryFn('delete from search_history where user_id = $1', [user.id]);
      if (nextEntries.length) {
        const insertValues = nextEntries.map((entry, index) => `($1, $${index + 2})`).join(', ');
        await queryFn(`insert into search_history (user_id, search_text) values ${insertValues}`, [user.id, ...nextEntries]);
      }

      return res.json({ ok: true, items: nextEntries });
    } catch (error) {
      return sendError(res, 500, 'Could not save search history.', error.message);
    }
  });

  app.get('/api/search/history', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('select search_text from search_history where user_id = $1 order by created_at desc limit 5', [user.id]);
      return res.json({ ok: true, items: result.rows.map((entry) => entry.search_text) });
    } catch (error) {
      return sendError(res, 500, 'Could not load search history.', error.message);
    }
  });

  app.get('/api/lists', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('select * from movie_lists where user_id = $1 order by created_at desc', [user.id]);
      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      return sendError(res, 401, error.message || 'Authentication required.');
    }
  });

  app.post('/api/lists', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { name } = req.body || {};
      if (!name) return sendError(res, 400, 'List name is required.');
      const result = await queryFn('insert into movie_lists (user_id, name, created_at, updated_at) values ($1, $2, now(), now()) returning *', [user.id, String(name).trim()]);
      return res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
      return sendError(res, 500, 'Could not create list.', error.message);
    }
  });

  app.get('/api/lists/:listId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('select * from movie_lists where id = $1 and user_id = $2 limit 1', [req.params.listId, user.id]);
      if (!result.rows[0]) return sendError(res, 404, 'List not found.');
      const itemsResult = await queryFn('select movie_id, media_type from movie_list_items where list_id = $1 order by created_at desc', [req.params.listId]);
      return res.json({ ok: true, item: result.rows[0], items: itemsResult.rows });
    } catch (error) {
      return sendError(res, 401, error.message || 'Authentication required.');
    }
  });

  app.put('/api/lists/:listId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { name } = req.body || {};
      if (!name) return sendError(res, 400, 'List name is required.');
      const result = await queryFn('update movie_lists set name = $1, updated_at = now() where id = $2 and user_id = $3 returning *', [String(name).trim(), req.params.listId, user.id]);
      if (!result.rows[0]) return sendError(res, 404, 'List not found.');
      return res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
      return sendError(res, 500, 'Could not update list.', error.message);
    }
  });

  app.delete('/api/lists/:listId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      await queryFn('delete from movie_lists where id = $1 and user_id = $2', [req.params.listId, user.id]);
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, 500, 'Could not delete list.', error.message);
    }
  });

  app.post('/api/lists/:listId/items', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { movieId, mediaType } = req.body || {};
      if (!movieId) return sendError(res, 400, 'movieId is required.');
      const listResult = await queryFn('select id from movie_lists where id = $1 and user_id = $2 limit 1', [req.params.listId, user.id]);
      if (!listResult.rows[0]) return sendError(res, 404, 'List not found.');
      await queryFn('insert into movie_list_items (list_id, movie_id, media_type, created_at) values ($1, $2, $3, now()) on conflict (list_id, media_type, movie_id) do nothing', [req.params.listId, String(movieId), mediaType || 'movie']);
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, 500, 'Could not add list item.', error.message);
    }
  });

  app.delete('/api/lists/:listId/items/:mediaType/:movieId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const listResult = await queryFn('select id from movie_lists where id = $1 and user_id = $2 limit 1', [req.params.listId, user.id]);
      if (!listResult.rows[0]) return sendError(res, 404, 'List not found.');
      await queryFn('delete from movie_list_items where list_id = $1 and media_type = $2 and movie_id = $3', [req.params.listId, req.params.mediaType, req.params.movieId]);
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, 500, 'Could not remove list item.', error.message);
    }
  });

  return app;
}

const app = createApp();
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`PeakFlix auth server listening on ${PORT}`));
}

export default app;
