import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

try {
  const schema = await fs.readFile(schemaPath, 'utf8');
  if (process.env.DATABASE_SCHEMA) {
    const schemaName = process.env.DATABASE_SCHEMA.replace(/"/g, '""');
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await pool.query(`SET search_path TO "${schemaName}"`);
  }
  await pool.query(schema);
  console.log('Database migration completed.');
} catch (error) {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
