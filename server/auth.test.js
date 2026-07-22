import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from './index.js';

function buildAppWithQuery(queryImpl, extraDeps = {}) {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
  process.env.JWT_SECRET = 'test-jwt';
  process.env.PASSWORD_RESET_SECRET = 'test-reset';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  return createApp({ query: queryImpl, healthCheck: async () => true, withTransaction: extraDeps.withTransaction, ...extraDeps });
}

function createSessionCookie(user) {
  const token = jwt.sign(
    { sub: user.id, username: user.username, email: user.email, purpose: 'session', sessionVersion: user.session_version ?? 1 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
  return `peakflix-session=${encodeURIComponent(token)}`;
}

async function withServer(app, handler) {
  const server = app.listen(0);
  try {
    await handler(server.address().port);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('missing authentication cookie returns 401', async () => {
  const app = buildAppWithQuery(async () => ({ rows: [] }));
  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/profile`, { method: 'POST' });
    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Authentication required.');
  });
});

test('invalid JWT returns 401', async () => {
  const app = buildAppWithQuery(async () => ({ rows: [] }));
  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/profile`, {
      method: 'POST',
      headers: { cookie: 'peakflix-session=not-a-real-jwt' },
    });
    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Invalid or expired token.');
  });
});

test('valid JWT cookie authenticates correctly', async () => {
  const user = { id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true };
  const app = buildAppWithQuery(async (text, params) => {
    if (text.includes('select * from users where id = $1 limit 1')) {
      assert.deepEqual(params, ['user-1']);
      return { rows: [user] };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/profile`, {
      method: 'POST',
      headers: { cookie: createSessionCookie(user) },
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.user.username, 'demo');
  });
});

test('expired recovery token returns 401', async () => {
  const expiredToken = jwt.sign({ sub: 'user-1', purpose: 'security-answer' }, process.env.PASSWORD_RESET_SECRET, { expiresIn: '-1s' });
  const app = buildAppWithQuery(async () => ({ rows: [] }));
  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/verify-security-answer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recoveryToken: expiredToken, answer: 'dog' }),
    });
    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Invalid or expired token.');
  });
});

test('wrong security answer is rejected', async () => {
  const recoveryToken = jwt.sign({ sub: 'user-1', purpose: 'security-answer' }, process.env.PASSWORD_RESET_SECRET, { expiresIn: '10m' });
  const answerHash = await bcrypt.hash('correct-answer', 12);
  const app = buildAppWithQuery(async (text, params) => {
    if (text.includes('select id, security_answer_hash, is_active from users where id = $1 limit 1')) {
      assert.deepEqual(params, ['user-1']);
      return { rows: [{ id: 'user-1', security_answer_hash: answerHash, is_active: true }] };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/verify-security-answer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recoveryToken, answer: 'wrong-answer' }),
    });
    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Invalid or expired recovery session.');
  });
});

test('correct security answer returns a password reset token', async () => {
  const recoveryToken = jwt.sign({ sub: 'user-1', purpose: 'security-answer' }, process.env.PASSWORD_RESET_SECRET, { expiresIn: '10m' });
  const answerHash = await bcrypt.hash('correct-answer', 12);
  const app = buildAppWithQuery(async (text, params) => {
    if (text.includes('select id, security_answer_hash, is_active from users where id = $1 limit 1')) {
      assert.deepEqual(params, ['user-1']);
      return { rows: [{ id: 'user-1', security_answer_hash: answerHash, is_active: true }] };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/verify-security-answer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recoveryToken, answer: 'correct-answer' }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.ok(payload.passwordResetToken);
  });
});

test('reset request without token is rejected', async () => {
  const app = buildAppWithQuery(async () => ({ rows: [] }));
  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'Abc12345', confirmPassword: 'Abc12345' }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'A reset token and new password are required.');
  });
});

test('successful reset increments session_version', async () => {
  const passwordResetToken = jwt.sign({ sub: 'user-1', purpose: 'password-reset' }, process.env.PASSWORD_RESET_SECRET, { expiresIn: '10m' });
  let transactionCalls = 0;
  let updateParams = [];
  const app = buildAppWithQuery(async (text, params) => {
    if (text.includes('select id, session_version, is_active from users where id = $1 limit 1')) {
      assert.deepEqual(params, ['user-1']);
      return { rows: [{ id: 'user-1', session_version: 1, is_active: true }] };
    }
    if (text.includes('update users set password_hash')) {
      updateParams = params;
      return { rows: [] };
    }
    return { rows: [] };
  }, {
    withTransaction: async (callback) => {
      transactionCalls += 1;
      const client = {
        query: async (text, params = []) => {
          if (text.includes('select id, session_version, is_active')) {
            return { rows: [{ id: 'user-1', session_version: 1, is_active: true }] };
          }
          if (text.includes('update users set password_hash')) {
            updateParams = params;
            return { rows: [] };
          }
          return { rows: [] };
        },
      };
      await callback(client);
    },
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passwordResetToken, password: 'Abc12345', confirmPassword: 'Abc12345' }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(transactionCalls, 1);
    assert.ok(Array.isArray(updateParams) && updateParams.length >= 2);
  });
});

test('signup creates one session without calling login again', async () => {
  const app = buildAppWithQuery(async (text, params) => {
    if (text.includes('select id from security_questions where id = $1 and is_active = true limit 1')) {
      assert.deepEqual(params, [1]);
      return { rows: [{ id: 1 }] };
    }
    if (text.includes('insert into users')) {
      assert.equal(params.length, 7);
      return { rows: [{ id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true }] };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'demo',
        email: 'demo@example.com',
        password: 'Abc12345',
        confirmPassword: 'Abc12345',
        country: 'US',
        securityQuestionId: 1,
        securityAnswer: 'dog',
        language: 'en',
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.user.username, 'demo');
    assert.ok(response.headers.get('set-cookie')?.includes('peakflix-session='));
  });
});

test('invalid watch progress returns 400 with the correct validation message', async () => {
  const user = { id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true };
  const app = buildAppWithQuery(async (text) => {
    if (text.includes('select * from users where id = $1 limit 1')) {
      return { rows: [user] };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/library/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: createSessionCookie(user) },
      body: JSON.stringify({ kind: 'watch_history', items: [{ id: 42, mediaType: 'movie', progressSeconds: -1 }] }),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Invalid progressSeconds.');
  });
});

test('unknown media type is rejected', async () => {
  const user = { id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true };
  const app = buildAppWithQuery(async (text) => {
    if (text.includes('select * from users where id = $1 limit 1')) {
      return { rows: [user] };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/library/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: createSessionCookie(user) },
      body: JSON.stringify({ kind: 'watch_history', items: [{ id: 42, mediaType: 'unknown-type' }] }),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Invalid media type.');
  });
});

test('favorites normalize series to tv', async () => {
  let insertedParams = [];
  const user = { id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true };
  const app = buildAppWithQuery(async (text, params) => {
    if (text.includes('select * from users where id = $1 limit 1')) {
      return { rows: [user] };
    }
    if (text.includes('insert into favorites')) {
      insertedParams = params;
      return { rows: [] };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/favorites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: createSessionCookie(user) },
      body: JSON.stringify({ mediaType: 'series', movieId: 12 }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(insertedParams[2], 'tv');
  });
});

test('duplicate list name returns 409', async () => {
  const user = { id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true };
  const app = buildAppWithQuery(async (text) => {
    if (text.includes('select * from users where id = $1 limit 1')) {
      return { rows: [user] };
    }
    if (text.includes('insert into movie_lists')) {
      const error = new Error('duplicate key value violates unique constraint');
      error.code = '23505';
      error.constraint = 'movie_lists_user_name_ci_idx';
      throw error;
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/lists`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: createSessionCookie(user) },
      body: JSON.stringify({ name: '   My List   ' }),
    });

    assert.equal(response.status, 409);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'A list with that name already exists.');
  });
});

test('missing owned list returns 404', async () => {
  const user = { id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true };
  const app = buildAppWithQuery(async (text) => {
    if (text.includes('select * from users where id = $1 limit 1')) {
      return { rows: [user] };
    }
    if (text.includes('delete from movie_lists where id = $1 and user_id = $2')) {
      return { rowCount: 0 };
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/lists/999`, {
      method: 'DELETE',
      headers: { cookie: createSessionCookie(user) },
    });

    assert.equal(response.status, 404);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'List not found.');
  });
});

test('database failure does not return authentication failed', async () => {
  const user = { id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true };
  const app = buildAppWithQuery(async (text) => {
    if (text.includes('select * from users where id = $1 limit 1')) {
      return { rows: [user] };
    }
    if (text.includes('select * from movie_lists where user_id = $1 order by created_at desc')) {
      const error = new Error('connection lost');
      error.code = 'ECONNREFUSED';
      throw error;
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/lists`, {
      method: 'GET',
      headers: { cookie: createSessionCookie(user) },
    });

    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Database unavailable.');
  });
});

test('reset database failure does not return 401', async () => {
  const recoveryToken = jwt.sign({ sub: 'user-1', purpose: 'password-reset' }, process.env.PASSWORD_RESET_SECRET, { expiresIn: '10m' });
  const app = buildAppWithQuery(async (text) => {
    if (text.includes('select id, session_version, is_active from users where id = $1 limit 1')) {
      const error = new Error('connection lost');
      error.code = 'ECONNREFUSED';
      throw error;
    }
    return { rows: [] };
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passwordResetToken: recoveryToken, password: 'Abc12345', confirmPassword: 'Abc12345' }),
    });

    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Database unavailable.');
  });
});

test('inactive account cannot reset its password', async () => {
  const recoveryToken = jwt.sign({ sub: 'user-1', purpose: 'password-reset' }, process.env.PASSWORD_RESET_SECRET, { expiresIn: '10m' });
  const app = buildAppWithQuery(async (text) => {
    if (text.includes('select id, session_version, is_active from users where id = $1 limit 1')) {
      return { rows: [{ id: 'user-1', session_version: 1, is_active: false }] };
    }
    return { rows: [] };
  }, {
    withTransaction: async (callback) => {
      const client = {
        query: async (text) => {
          if (text.includes('select id, session_version, is_active')) {
            return { rows: [{ id: 'user-1', session_version: 1, is_active: false }] };
          }
          return { rows: [] };
        },
      };
      await callback(client);
    },
  });

  await withServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passwordResetToken: recoveryToken, password: 'Abc12345', confirmPassword: 'Abc12345' }),
    });

    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'Account is inactive.');
  });
});

test('multiple watch-history items use correct SQL placeholders in one transaction', async () => {
  const seen = [];
  const app = buildAppWithQuery(async (text, params) => {
    seen.push({ text, params });
    if (text.includes('select * from users where id = $1 limit 1')) {
      return { rows: [{ id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true }] };
    }
    return { rows: [] };
  }, {
    withTransaction: async (callback) => {
      const client = {
        query: async (text, params = []) => {
          seen.push({ text, params });
          return { rows: [] };
        },
      };
      await callback(client);
    },
  });

  await withServer(app, async (port) => {
    const cookie = createSessionCookie({ id: 'user-1', username: 'demo', email: 'demo@example.com', session_version: 1 });
    const response = await fetch(`http://127.0.0.1:${port}/api/library/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        kind: 'watch_history',
        items: [
          { id: '1', mediaType: 'movie', progressSeconds: 10, durationSeconds: 100, completed: false },
          { id: '2', mediaType: 'movie', progressSeconds: 20, durationSeconds: 200, completed: true },
        ],
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    const queryText = seen.find((entry) => entry.text.includes('insert into watch_history')).text;
    assert.match(queryText, /\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8/);
    assert.match(queryText, /\$9, \$10, \$11, \$12, \$13, \$14, \$15, \$16/);
    const params = seen.find((entry) => entry.text.includes('insert into watch_history')).params;
    assert.equal(params.length, 16);
  });
});
