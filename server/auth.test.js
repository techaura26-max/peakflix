import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.js';

function buildAppWithQuery(queryImpl) {
  process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
  process.env.JWT_SECRET = 'test-jwt';
  process.env.PASSWORD_RESET_SECRET = 'test-reset';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  return createApp({ query: queryImpl, healthCheck: async () => true });
}

test('expired reset tokens return 401 without leaking details', async () => {
  const app = buildAppWithQuery(async () => ({ rows: [] }));
  const response = await fetch('http://127.0.0.1:0/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: '123', password: 'Abc12345', token: 'bad-token' }),
  });
  assert.equal(response.status, 401);
  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'Invalid or expired reset token.');
});

test('favorites add/remove routes are idempotent for authenticated users', async () => {
  let calls = [];
  const app = buildAppWithQuery(async (text, params) => {
    calls.push({ text, params });
    if (text.includes('select * from users')) {
      return { rows: [{ id: 'user-1', username: 'demo', email: 'demo@example.com', country: 'US', language: 'en', security_question_id: 1, session_version: 1, is_active: true }] };
    }
    if (text.includes('insert into favorites')) {
      return { rows: [] };
    }
    if (text.includes('delete from favorites')) {
      return { rows: [] };
    }
    if (text.includes('select movie_id')) {
      return { rows: [] };
    }
    return { rows: [] };
  });
  const server = app.listen(0);
  try {
    const addResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/favorites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'peakflix-session=token' },
      body: JSON.stringify({ mediaType: 'movie', movieId: '123' }),
    });
    assert.equal(addResponse.status, 200);
    const deleteResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/favorites/movie/123`, {
      method: 'DELETE',
      headers: { cookie: 'peakflix-session=token' },
    });
    assert.equal(deleteResponse.status, 200);
  } finally {
    server.close();
  }
});
