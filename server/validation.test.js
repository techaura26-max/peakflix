import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, normalizeUsername, normalizeSearchText, validatePassword } from './validation.js';

test('normalizes emails and usernames for storage', () => {
  assert.equal(normalizeEmail(' User@Example.COM '), 'user@example.com');
  assert.equal(normalizeUsername('  Jane Doe  '), 'Jane Doe');
});

test('trims search text and rejects empty input', () => {
  assert.equal(normalizeSearchText('  matrix  '), 'matrix');
  assert.equal(normalizeSearchText('   '), '');
});

test('enforces password strength', () => {
  assert.equal(validatePassword('short').ok, false);
  assert.equal(validatePassword('StrongPass1!').ok, true);
});
