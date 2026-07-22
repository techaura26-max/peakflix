import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query, healthCheck, withTransaction } from './db.js';
import { normalizeEmail, normalizeUsername, normalizeSecurityAnswer, normalizeSearchText, normalizeMediaType, validateIdentifier, validatePassword } from './validation.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const COOKIE_NAME = 'peakflix-session';

export function createApp(deps = {}) {
  const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'PASSWORD_RESET_SECRET', 'FRONTEND_URL'];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  if (missingEnv.length) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET;
  const FRONTEND_URL = process.env.FRONTEND_URL;

  const app = express();
  const queryFn = deps.query || query;
  const healthCheckFn = deps.healthCheck || healthCheck;
  const transactionFn = deps.withTransaction || withTransaction;

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

  const sendError = (res, status, message) => res.status(status).json({ ok: false, error: message });

  const getRouteError = (error) => {
    const message = typeof error?.message === 'string' ? error.message : '';

    if (message === 'Authentication required.' || message === 'Invalid or expired token.' || message === 'Invalid or expired reset token.' || message === 'Invalid or expired recovery session.' || message === 'Account not found.' || message === 'Account is inactive.' || message === 'Session is no longer valid.' || message === 'Invalid token purpose.') {
      return { status: 401, message };
    }

    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return { status: 401, message: 'Invalid or expired token.' };
    }

    if (message === 'Invalid payload.' || message === 'Unsupported library kind.' || message === 'Search text is required.' || message === 'movieId is required.' || message === 'List name is required.' || message === 'List name must be 60 characters or fewer.' || message === 'Invalid media type.' || message === 'Invalid progressSeconds.' || message === 'Invalid durationSeconds.' || message === 'Invalid seasonNumber.' || message === 'Invalid episodeNumber.' || message === 'Unsupported media type.' || message === 'Passwords must match.' || message === 'A reset token and new password are required.' || message === 'Security answer is required.' || message === 'Please provide your email or username.') {
      return { status: 400, message };
    }

    if (message === 'List not found.') {
      return { status: 404, message };
    }

    if (error?.code === '23505') {
      if (error?.constraint === 'users_username_ci_idx') return { status: 409, message: 'That username is already taken.' };
      if (error?.constraint === 'users_email_ci_idx') return { status: 409, message: 'That email is already registered.' };
      if (error?.constraint === 'movie_lists_user_name_ci_idx') return { status: 409, message: 'A list with that name already exists.' };
      if (error?.constraint === 'favorites_user_media_movie_uidx') return { status: 409, message: 'This favorite is already saved.' };
      if (error?.constraint === 'movie_list_items_list_media_movie_uidx') return { status: 409, message: 'This list item already exists.' };
      return { status: 409, message: 'Conflict.' };
    }

    if (error?.code === '23503') {
      return { status: 400, message: 'Invalid reference.' };
    }

    if (error?.code === 'ECONNREFUSED' || error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND' || error?.code === '57P01') {
      return { status: 503, message: 'Database unavailable.' };
    }

    if (message === 'Database unavailable.') {
      return { status: 503, message };
    }

    return { status: 500, message: 'Unexpected error.' };
  };

  const createToken = (user) => jwt.sign(
    { sub: user.id, username: user.username, email: user.email, purpose: 'session', sessionVersion: user.session_version ?? 1 },
    JWT_SECRET,
    { expiresIn: '7d' },
  );

  const createRecoveryToken = (user) => jwt.sign({ sub: user.id, purpose: 'security-answer' }, PASSWORD_RESET_SECRET, { expiresIn: '10m' });

  const createPasswordResetToken = (user) => jwt.sign({ sub: user.id, purpose: 'password-reset' }, PASSWORD_RESET_SECRET, { expiresIn: '10m' });

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

    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose !== 'session') throw new Error('Invalid token purpose.');

    const result = await queryFn('select * from users where id = $1 limit 1', [payload.sub]);
    const user = result.rows[0];
    if (!user) throw new Error('Account not found.');
    if (payload.sessionVersion !== user.session_version) throw new Error('Session is no longer valid.');

    return { payload, user };
  };

  app.get('/api/health', async (_req, res) => {
    try {
      const ok = await healthCheckFn();
      return res.json({ ok, database: ok ? 'ok' : 'unavailable' });
    } catch {
      return sendError(res, 503, 'Database unavailable.');
    }
  });

  app.get('/api/auth/security-questions', async (_req, res) => {
    try {
      const result = await queryFn('select id, question from security_questions where is_active = true order by id');
      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { username, email, password, confirmPassword, country, securityQuestionId, securityAnswer, language } = req.body || {};
      const trimmedUsername = normalizeUsername(username);
      const normalizedEmail = normalizeEmail(email);
      const normalizedAnswer = normalizeSecurityAnswer(securityAnswer);

      if (!trimmedUsername || !normalizedEmail || !password || !confirmPassword || !country || !securityQuestionId || !normalizedAnswer) {
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

      const securityQuestionResult = await queryFn('select id from security_questions where id = $1 and is_active = true limit 1', [Number(securityQuestionId)]);
      if (!securityQuestionResult.rows[0]) return sendError(res, 400, 'Please select a valid security question.');

      const existingUser = await queryFn('select id from users where lower(trim(username)) = lower(trim($1)) limit 1', [trimmedUsername]);
      if (existingUser.rows[0]) return sendError(res, 409, 'That username is already taken.');

      const existingEmail = await queryFn('select id from users where lower(trim(email)) = lower(trim($1)) limit 1', [normalizedEmail]);
      if (existingEmail.rows[0]) return sendError(res, 409, 'That email is already registered.');

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const answerHash = await bcrypt.hash(normalizedAnswer, BCRYPT_ROUNDS);

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
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) return sendError(res, 400, 'Email/username and password are required.');

      const normalizedIdentifier = normalizeEmail(normalizeUsername(identifier));
      const userResult = await queryFn('select * from users where lower(trim(email)) = lower(trim($1)) or lower(trim(username)) = lower(trim($1)) limit 1', [normalizedIdentifier]);
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
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
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
      const userResult = await queryFn(`
        select u.id, u.security_question_id, sq.question, u.is_active
        from users u
        join security_questions sq on sq.id = u.security_question_id
        where lower(u.email) = lower($1) or lower(u.username) = lower($1)
        limit 1
      `, [normalizedIdentifier]);
      const user = userResult.rows[0];
      if (!user || !user.is_active) {
        return res.json({ ok: true, message: 'If that account exists, recovery details will be provided.' });
      }

      const recoveryToken = createRecoveryToken({ id: user.id });
      return res.json({ ok: true, user: { security_question_id: user.security_question_id, security_question: user.question }, recoveryToken });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/auth/verify-security-answer', async (req, res) => {
    try {
      const { recoveryToken, answer } = req.body || {};
      if (!recoveryToken || !answer) return sendError(res, 400, 'Security answer is required.');

      const payload = jwt.verify(recoveryToken, PASSWORD_RESET_SECRET);
      if (payload.purpose !== 'security-answer') return sendError(res, 401, 'Invalid or expired recovery session.');

      const userResult = await queryFn('select id, security_answer_hash, is_active from users where id = $1 limit 1', [payload.sub]);
      const user = userResult.rows[0];
      if (!user) return sendError(res, 401, 'Invalid or expired recovery session.');
      if (user.is_active === false) return sendError(res, 401, 'Account is inactive.');

      const normalizedAnswer = normalizeSecurityAnswer(answer);
      const match = await bcrypt.compare(normalizedAnswer, user.security_answer_hash);
      if (!match) return sendError(res, 401, 'Invalid or expired recovery session.');

      const passwordResetToken = createPasswordResetToken({ id: user.id });
      return res.json({ ok: true, passwordResetToken });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { passwordResetToken, password, confirmPassword } = req.body || {};
      if (!passwordResetToken || !password || !confirmPassword) return sendError(res, 400, 'A reset token and new password are required.');
      if (password !== confirmPassword) return sendError(res, 400, 'Passwords must match.');

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.ok) return sendError(res, 400, passwordValidation.error);

      const payload = jwt.verify(passwordResetToken, PASSWORD_RESET_SECRET);
      if (payload.purpose !== 'password-reset') return sendError(res, 401, 'Invalid or expired reset token.');

      const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
      await transactionFn(async (client) => {
        const userResult = await client.query('select id, session_version, is_active from users where id = $1 limit 1', [payload.sub]);
        const existingUser = userResult.rows[0];
        if (!existingUser) {
          throw new Error('Invalid or expired reset token.');
        }
        if (existingUser.is_active === false) {
          throw new Error('Account is inactive.');
        }
        await client.query(
          'update users set password_hash = $1, password_changed_at = now(), session_version = session_version + 1, updated_at = now() where id = $2',
          [passwordHash, payload.sub],
        );
      });

      return res.json({ ok: true, message: 'Password updated successfully.' });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/auth/profile', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      return res.json({ ok: true, user: normalizeUser(user) });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
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
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/favorites', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { mediaType, movieId } = req.body || {};
      if (!movieId) return sendError(res, 400, 'movieId is required.');
      const normalizedMediaType = normalizeMediaType(mediaType);
      if (!normalizedMediaType) return sendError(res, 400, 'Invalid media type.');
      await queryFn('insert into favorites (user_id, movie_id, media_type, created_at) values ($1, $2, $3, now()) on conflict (user_id, media_type, movie_id) do nothing', [user.id, String(movieId), normalizedMediaType]);
      return res.json({ ok: true });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.delete('/api/favorites/:mediaType/:movieId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { mediaType, movieId } = req.params;
      const normalizedMediaType = normalizeMediaType(mediaType);
      if (!normalizedMediaType) return sendError(res, 400, 'Invalid media type.');
      await queryFn('delete from favorites where user_id = $1 and media_type = $2 and movie_id = $3', [user.id, normalizedMediaType, movieId]);
      return res.json({ ok: true });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.get('/api/favorites', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('select movie_id, media_type from favorites where user_id = $1 order by created_at desc', [user.id]);
      return res.json({ ok: true, items: result.rows.map((entry) => ({ id: entry.movie_id, mediaType: entry.media_type })) });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
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
        const toInsert = [];
        for (const item of incoming) {
          const normalizedMediaType = normalizeMediaType(item.mediaType);
          if (!normalizedMediaType) {
            throw new Error('Invalid media type.');
          }
          const key = `${normalizedMediaType}:${String(item.id)}`;
          if (!existing.has(key)) {
            toInsert.push({ id: String(item.id), mediaType: normalizedMediaType });
          }
        }
        for (const item of toInsert) {
          await queryFn('insert into favorites (user_id, movie_id, media_type, created_at) values ($1, $2, $3, now()) on conflict (user_id, media_type, movie_id) do nothing', [user.id, item.id, item.mediaType]);
        }
        return res.json({ ok: true });
      }

      if (kind === 'watch_history') {
        const incoming = items.filter((item) => item && item.id !== undefined && item.id !== null);
        if (!incoming.length) return res.json({ ok: true });

        const normalizedRows = incoming.map((item) => {
          const mediaType = normalizeMediaType(item.mediaType);
          if (!mediaType) throw new Error('Invalid media type.');
          const movieId = String(item.id).trim();
          if (!movieId) throw new Error('movieId is required.');

          const seasonNumber = item.seasonNumber === undefined || item.seasonNumber === null ? null : Number(item.seasonNumber);
          const episodeNumber = item.episodeNumber === undefined || item.episodeNumber === null ? null : Number(item.episodeNumber);
          const progressSeconds = Number(item.progressSeconds ?? 0);
          const durationSeconds = Number(item.durationSeconds ?? 0);

          if (!Number.isFinite(seasonNumber) && seasonNumber !== null) throw new Error('Invalid seasonNumber.');
          if (!Number.isFinite(episodeNumber) && episodeNumber !== null) throw new Error('Invalid episodeNumber.');
          if (!Number.isFinite(progressSeconds) || progressSeconds < 0) throw new Error('Invalid progressSeconds.');
          if (!Number.isFinite(durationSeconds) || durationSeconds < 0) throw new Error('Invalid durationSeconds.');

          return { mediaType, movieId, seasonNumber, episodeNumber, progressSeconds, durationSeconds, completed: Boolean(item.completed) };
        });

        const values = normalizedRows.map((_, rowIndex) => {
          const start = rowIndex * 8 + 1;
          return `($${start}, $${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7}, now(), now(), now())`;
        }).join(', ');

        await transactionFn(async (client) => {
          await client.query(`
            insert into watch_history (
              user_id, movie_id, season_number, episode_number, progress_seconds, duration_seconds, media_type, completed, created_at, updated_at, last_watched_at
            ) values ${values}
            on conflict (user_id, media_type, movie_id, (coalesce(season_number, 0)), (coalesce(episode_number, 0))) do update set
              progress_seconds = excluded.progress_seconds,
              duration_seconds = excluded.duration_seconds,
              completed = excluded.completed,
              updated_at = now(),
              last_watched_at = now()
          `, normalizedRows.flatMap((row) => [user.id, row.movieId, row.seasonNumber, row.episodeNumber, row.progressSeconds, row.durationSeconds, row.mediaType, row.completed]));
        });

        return res.json({ ok: true });
      }

      return sendError(res, 400, 'Unsupported library kind.');
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
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
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
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
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.get('/api/search/history', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('select search_text from search_history where user_id = $1 order by created_at desc limit 5', [user.id]);
      return res.json({ ok: true, items: result.rows.map((entry) => entry.search_text) });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.get('/api/lists', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('select * from movie_lists where user_id = $1 order by created_at desc', [user.id]);
      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/lists', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { name } = req.body || {};
      const normalizedName = String(name || '').trim();
      if (!normalizedName) return sendError(res, 400, 'List name is required.');
      if (normalizedName.length > 60) return sendError(res, 400, 'List name must be 60 characters or fewer.');
      const result = await queryFn('insert into movie_lists (user_id, name, created_at, updated_at) values ($1, $2, now(), now()) returning *', [user.id, normalizedName]);
      return res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
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
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.put('/api/lists/:listId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { name } = req.body || {};
      const normalizedName = String(name || '').trim();
      if (!normalizedName) return sendError(res, 400, 'List name is required.');
      if (normalizedName.length > 60) return sendError(res, 400, 'List name must be 60 characters or fewer.');
      const result = await queryFn('update movie_lists set name = $1, updated_at = now() where id = $2 and user_id = $3 returning *', [normalizedName, req.params.listId, user.id]);
      if (!result.rows[0]) return sendError(res, 404, 'List not found.');
      return res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.delete('/api/lists/:listId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const result = await queryFn('delete from movie_lists where id = $1 and user_id = $2', [req.params.listId, user.id]);
      if (!result.rowCount) return sendError(res, 404, 'List not found.');
      return res.json({ ok: true });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.post('/api/lists/:listId/items', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const { movieId, mediaType } = req.body || {};
      if (!movieId) return sendError(res, 400, 'movieId is required.');
      const normalizedMediaType = normalizeMediaType(mediaType);
      if (!normalizedMediaType) return sendError(res, 400, 'Invalid media type.');
      const listResult = await queryFn('select id from movie_lists where id = $1 and user_id = $2 limit 1', [req.params.listId, user.id]);
      if (!listResult.rows[0]) return sendError(res, 404, 'List not found.');
      await queryFn('insert into movie_list_items (list_id, movie_id, media_type, created_at) values ($1, $2, $3, now()) on conflict (list_id, media_type, movie_id) do nothing', [req.params.listId, String(movieId), normalizedMediaType]);
      return res.json({ ok: true });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  app.delete('/api/lists/:listId/items/:mediaType/:movieId', async (req, res) => {
    try {
      const { user } = await getAuthenticatedUser(req);
      const normalizedMediaType = normalizeMediaType(req.params.mediaType);
      if (!normalizedMediaType) return sendError(res, 400, 'Invalid media type.');
      const listResult = await queryFn('select id from movie_lists where id = $1 and user_id = $2 limit 1', [req.params.listId, user.id]);
      if (!listResult.rows[0]) return sendError(res, 404, 'List not found.');
      await queryFn('delete from movie_list_items where list_id = $1 and media_type = $2 and movie_id = $3', [req.params.listId, normalizedMediaType, req.params.movieId]);
      return res.json({ ok: true });
    } catch (error) {
      const routeError = getRouteError(error);
      return sendError(res, routeError.status, routeError.message);
    }
  });

  return app;
}

if (process.env.NODE_ENV !== 'test' && process.env.npm_lifecycle_event === 'server') {
  const app = createApp();
  app.listen(PORT, () => console.log(`PeakFlix auth server listening on ${PORT}`));
}

export default createApp;
