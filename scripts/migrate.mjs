import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { closePool, withConnection } from '../server/db.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Copy .env.example to .env and add your PostgreSQL connection string.');
  process.exit(1);
}

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = path.join(rootDirectory, 'database', 'migrations');
const migrationLockId = 729_341_907;

try {
  await withConnection(async (client) => {
    await client.query('select pg_advisory_lock($1)', [migrationLockId]);
    try {
      await client.query(`
        create table if not exists peakflix_schema_migrations (
          name text primary key,
          checksum text not null,
          applied_at timestamptz not null default now()
        )
      `);

      const names = (await readdir(migrationsDirectory))
        .filter((name) => /^\d+_.+\.sql$/.test(name))
        .sort((left, right) => left.localeCompare(right));

      for (const name of names) {
        const sql = await readFile(path.join(migrationsDirectory, name), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const existing = await client.query(
          'select checksum from peakflix_schema_migrations where name = $1',
          [name],
        );

        if (existing.rows[0]) {
          if (existing.rows[0].checksum !== checksum) {
            throw new Error(`Migration ${name} was changed after it was applied. Create a new migration instead.`);
          }
          console.log(`Already applied: ${name}`);
          continue;
        }

        console.log(`Applying: ${name}`);
        await client.query(sql);
        await client.query(
          'insert into peakflix_schema_migrations (name, checksum) values ($1, $2)',
          [name, checksum],
        );
      }
    } finally {
      await client.query('select pg_advisory_unlock($1)', [migrationLockId]);
    }
  });
  console.log('PeakFlix database is up to date.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
