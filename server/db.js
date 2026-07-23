import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const sslMode = process.env.DATABASE_SSL_MODE || (process.env.NODE_ENV === 'production' ? 'require' : 'disable');
const ssl = sslMode === 'disable'
  ? false
  : {
      rejectUnauthorized: sslMode === 'verify-full',
      ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') } : {}),
    };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 5000),
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000),
  statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS || 10000),
  query_timeout: Number(process.env.DATABASE_QUERY_TIMEOUT_MS || 12000),
  application_name: 'peakflix-api',
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck() {
  const result = await query('select 1 as ok');
  return result.rows[0]?.ok === 1;
}

export async function withConnection(callback) {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
