import crypto from 'node:crypto';
import { query } from '../db.js';

export const SESSION_COOKIE_NAME = 'nutriai_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const VALID_ROLES = new Set(['user', 'coach', 'admin']);
const PUBLIC_REGISTRATION_ROLES = new Set(['user', 'coach']);
let warnedMissingSessionSecret = false;

export function isValidNickname(nickname) {
  return /^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(nickname);
}

export function normalizeRole(role, fallback = 'user') {
  const normalized = String(role || '').trim().toLowerCase();
  return VALID_ROLES.has(normalized) ? normalized : fallback;
}

export function normalizePublicRegistrationRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return PUBLIC_REGISTRATION_ROLES.has(normalized) ? normalized : 'user';
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

export function safeUser(user = {}) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    name: user.name,
    role: normalizeRole(user.role),
    created_date: user.created_date,
    updated_date: user.updated_date,
  };
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL || 'nutriai-local-session-secret';
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production' && !warnedMissingSessionSecret) {
    warnedMissingSessionSecret = true;
    console.warn('SESSION_SECRET is not set. Set it in production to keep auth cookies stable and secure.');
  }
  return secret;
}

function hmac(value) {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body)}`;
}

function verifySessionToken(token) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature || !secureCompare(signature, hmac(body))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.sub || Number(payload.exp || 0) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const index = entry.indexOf('=');
      if (index === -1) return cookies;
      const key = decodeURIComponent(entry.slice(0, index));
      cookies[key] = decodeURIComponent(entry.slice(index + 1));
      return cookies;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  const secure = process.env.SESSION_COOKIE_SECURE
    ? process.env.SESSION_COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: process.env.SESSION_SAME_SITE || (secure ? 'None' : 'Lax'),
    secure,
  };
}

export function setSessionCookie(res, user) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, createSessionToken(user), sessionCookieOptions())
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, '', sessionCookieOptions(0))
  );
}

export async function getSessionUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE_NAME];
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const result = await query(
    `SELECT id, email, nickname, name, role, created_date, updated_date
     FROM app_users
     WHERE id = $1
     LIMIT 1`,
    [payload.sub]
  );
  return safeUser(result.rows[0]);
}

export async function requireAuth(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(allowedRoles = []) {
  const allowed = new Set(allowedRoles.map((role) => normalizeRole(role)));
  return (req, res, next) => {
    if (!req.user || !allowed.has(normalizeRole(req.user.role))) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}
