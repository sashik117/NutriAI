import crypto from 'node:crypto';
import { query } from '../db.js';

export function requestUser(req) {
  const email = String(req.headers['x-user-email'] || process.env.LOCAL_USER_EMAIL || 'local@nutriai.app').trim().toLowerCase();
  const nickname = String(req.headers['x-user-nickname'] || req.headers['x-user-name'] || email.split('@')[0] || 'localuser').trim();
  const name = String(req.headers['x-user-name'] || nickname || process.env.LOCAL_USER_NAME || 'Local User').trim();
  return { email, nickname, name };
}

export function isValidNickname(nickname) {
  return /^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(nickname);
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(hash, 'hex');
  return original.length === candidate.length && crypto.timingSafeEqual(original, candidate);
}

export function createEmailCode() {
  return String(crypto.randomInt(100000, 999999));
}

export async function currentUser(req) {
  const { email, nickname, name } = requestUser(req);
  const result = await query(
    `INSERT INTO app_users (email, nickname, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_date = now()
     RETURNING id, email, nickname, name, created_date, updated_date`,
    [email, nickname, name]
  );
  return result.rows[0];
}
