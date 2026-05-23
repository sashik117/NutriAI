import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. PostgreSQL-backed routes will fail until it is configured.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  options:
    process.env.DATABASE_SCHEMA && process.env.DATABASE_SCHEMA !== 'public'
      ? `-c search_path=${process.env.DATABASE_SCHEMA}`
      : undefined,
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}
