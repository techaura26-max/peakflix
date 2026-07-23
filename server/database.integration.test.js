import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const enabled = process.env.RUN_DATABASE_TESTS === 'true';
const databaseTest = enabled ? test : test.skip;
const pool = enabled ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;

databaseTest('all migrations are recorded', async () => {
  const result = await pool.query('select name from peakflix_schema_migrations order by name');
  assert.deepEqual(result.rows.map((row) => row.name), [
    '001_initial_schema.sql',
    '002_production_improvements.sql',
    '003_security_integrity.sql',
  ]);
});

databaseTest('all ten security questions are active', async () => {
  const result = await pool.query('select id from security_questions where is_active = true order by id');
  assert.deepEqual(result.rows.map((row) => row.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

databaseTest('application tables have row level security enabled', async () => {
  const result = await pool.query(`
    select relname, relrowsecurity
    from pg_class
    where relname = any($1::text[])
    order by relname
  `, [[
    'favorites',
    'movie_list_items',
    'movie_lists',
    'search_history',
    'security_questions',
    'users',
    'watch_history',
  ]]);
  assert.equal(result.rows.length, 7);
  assert.ok(result.rows.every((row) => row.relrowsecurity === true));
});

databaseTest('important integrity constraints and indexes exist', async () => {
  const constraints = await pool.query(`
    select conname from pg_constraint
    where conname = any($1::text[])
  `, [[
    'users_language_check',
    'watch_history_progress_duration_check',
    'movie_lists_name_length_check',
    'search_history_text_length_check',
  ]]);
  assert.equal(constraints.rows.length, 4);

  const indexes = await pool.query(`
    select indexname from pg_indexes
    where indexname = any($1::text[])
  `, [[
    'users_email_ci_idx',
    'watch_history_logical_key_uidx',
    'favorites_user_media_movie_uidx',
    'search_history_user_text_ci_uidx',
  ]]);
  assert.equal(indexes.rows.length, 4);
});

test.after(async () => {
  if (pool) await pool.end();
});
