import { Router } from 'express';
import { query } from '../db.js';
import {
  clearSessionCookie,
  createEmailCode,
  getSessionUser,
  hashPassword,
  isValidNickname,
  normalizePublicRegistrationRole,
  safeUser,
  setSessionCookie,
  verifyPassword,
} from '../auth/authService.js';
import { sendVerificationCode } from '../services/emailService.js';
import { serialize } from '../utils/serialize.js';

function parseRegistrationBody(body = {}) {
  return {
    email: String(body.email || '').trim().toLowerCase(),
    nickname: String(body.nickname || '').trim(),
    password: String(body.password || ''),
    role: normalizePublicRegistrationRole(body.role),
  };
}

function validateRegistrationInput({ email, nickname, password }, res) {
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required.' });
    return false;
  }
  if (!isValidNickname(nickname)) {
    res.status(400).json({ error: 'Nickname must be 3-20 English letters, numbers, or underscores, and start with a letter.' });
    return false;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return false;
  }
  return true;
}

async function hasExistingUser(email, nickname) {
  const existing = await query('SELECT id FROM app_users WHERE lower(email) = $1 OR lower(nickname) = $2', [email, nickname.toLowerCase()]);
  return existing.rows.length > 0;
}

async function createUser({ email, nickname, passwordHash, role = 'user' }) {
  const result = await query(
    `INSERT INTO app_users (email, nickname, name, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, nickname, name, role, created_date, updated_date`,
    [email, nickname, nickname, passwordHash, normalizePublicRegistrationRole(role)]
  );
  return result.rows[0];
}

export function createAuthRouter() {
  const router = Router();
  const pendingEmailCodes = new Map();

  router.get('/me', async (req, res, next) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      res.json(serialize(user));
    } catch (error) {
      next(error);
    }
  });

  router.post('/register', async (req, res, next) => {
    try {
      const input = parseRegistrationBody(req.body);
      if (!validateRegistrationInput(input, res)) return;
      if (await hasExistingUser(input.email, input.nickname)) {
        res.status(409).json({ error: 'Email or nickname is already registered.' });
        return;
      }

      const user = await createUser({ ...input, passwordHash: hashPassword(input.password) });
      setSessionCookie(res, user);
      res.status(201).json(serialize(user));
    } catch (error) {
      next(error);
    }
  });

  router.post('/request-code', async (req, res, next) => {
    try {
      const input = parseRegistrationBody(req.body);
      if (!validateRegistrationInput(input, res)) return;
      if (await hasExistingUser(input.email, input.nickname)) {
        res.status(409).json({ error: 'Email or nickname is already registered.' });
        return;
      }

      const code = createEmailCode();
      pendingEmailCodes.set(input.email, {
        code,
        nickname: input.nickname,
        passwordHash: hashPassword(input.password),
        role: input.role,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const delivery = await sendVerificationCode(input.email, code);
      if (!delivery.sent && process.env.NODE_ENV === 'production') {
        pendingEmailCodes.delete(input.email);
        res.status(503).json({ error: 'Email delivery is not configured. Add SMTP settings and try again.' });
        return;
      }

      res.json({
        ok: true,
        message: delivery.sent ? 'Verification code sent.' : 'Verification code created in dev mode.',
        delivery: delivery.mode,
        dev_code: process.env.NODE_ENV === 'production' ? undefined : code,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/verify-register', async (req, res, next) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const code = String(req.body?.code || '').trim();
      const pending = pendingEmailCodes.get(email);

      if (!pending || pending.expiresAt < Date.now()) {
        pendingEmailCodes.delete(email);
        res.status(400).json({ error: 'Verification code expired. Request a new one.' });
        return;
      }
      if (pending.code !== code) {
        res.status(400).json({ error: 'Invalid verification code.' });
        return;
      }

      if (await hasExistingUser(email, pending.nickname)) {
        pendingEmailCodes.delete(email);
        res.status(409).json({ error: 'Email or nickname is already registered.' });
        return;
      }

      const user = await createUser({
        email,
        nickname: pending.nickname,
        passwordHash: pending.passwordHash,
        role: pending.role,
      });
      pendingEmailCodes.delete(email);
      setSessionCookie(res, user);
      res.status(201).json(serialize(user));
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const identifier = String(req.body?.identifier || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      if (!identifier || !password) {
        res.status(400).json({ error: 'Nickname/email and password are required.' });
        return;
      }

      const result = await query(
        `SELECT id, email, nickname, name, role, password_hash, created_date, updated_date
         FROM app_users
         WHERE lower(email) = $1 OR lower(nickname) = $1
         LIMIT 1`,
        [identifier]
      );
      const user = result.rows[0];
      if (!user || !verifyPassword(password, user.password_hash)) {
        res.status(401).json({ error: 'Invalid nickname/email or password.' });
        return;
      }

      const userForSession = safeUser(user);
      setSessionCookie(res, userForSession);
      res.json(serialize(userForSession));
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (_req, res, next) => {
    try {
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
