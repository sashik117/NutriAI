import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, query } from './db.js';
import { AIService } from './services/aiService.js';
import { NutritionService } from './services/nutritionService.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

await fs.mkdir(uploadsDir, { recursive: true });

const upload = multer({ dest: uploadsDir });
const uploadedFiles = new Map();
const aiService = new AIService({ uploadedFiles });
const nutritionService = new NutritionService();
const pendingEmailCodes = new Map();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

const entityConfig = {
  UserProfile: {
    table: 'user_profiles',
    columns: ['gender', 'age', 'weight', 'target_weight', 'height', 'activity_level', 'goal', 'daily_calories', 'daily_proteins', 'daily_fats', 'daily_carbs', 'daily_water_ml', 'ai_personality', 'quick_presets'],
    jsonColumns: ['quick_presets'],
  },
  FoodLog: {
    table: 'food_logs',
    columns: ['meal_type', 'description', 'items', 'total_calories', 'total_proteins', 'total_fats', 'total_carbs', 'date'],
    jsonColumns: ['items'],
  },
  WaterLog: {
    table: 'water_logs',
    columns: ['amount_ml', 'date'],
  },
  WeightLog: {
    table: 'weight_logs',
    columns: ['weight', 'date', 'note'],
  },
  BodyMeasurement: {
    table: 'body_measurements',
    columns: ['date', 'waist', 'hips', 'chest'],
  },
  Achievement: {
    table: 'achievements',
    columns: ['type', 'title', 'description', 'emoji', 'unlocked_date'],
    uniqueBy: 'type',
  },
  MealPlan: {
    table: 'meal_plans',
    columns: ['title', 'plan', 'selected_day_index'],
    jsonColumns: ['plan'],
  },
};

function serialize(row) {
  const localDate = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const numericKeys = new Set([
    'age',
    'weight',
    'target_weight',
    'height',
    'daily_calories',
    'daily_proteins',
    'daily_fats',
    'daily_carbs',
    'daily_water_ml',
    'total_calories',
    'total_proteins',
    'total_fats',
    'total_carbs',
    'amount_ml',
    'waist',
    'hips',
    'chest',
  ]);

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) {
        if (key === 'date' || key === 'unlocked_date') return [key, localDate(value)];
        return [key, value.toISOString()];
      }
      if (numericKeys.has(key) && value !== null && value !== undefined) {
        return [key, Number(value)];
      }
      return [key, value];
    })
  );
}

function requestUser(req) {
  const email = String(req.headers['x-user-email'] || process.env.LOCAL_USER_EMAIL || 'local@nutriai.app').trim().toLowerCase();
  const nickname = String(req.headers['x-user-nickname'] || req.headers['x-user-name'] || email.split('@')[0] || 'localuser').trim();
  const name = String(req.headers['x-user-name'] || nickname || process.env.LOCAL_USER_NAME || 'Local User').trim();
  return { email, nickname, name };
}

function isValidNickname(nickname) {
  return /^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(nickname);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(hash, 'hex');
  return original.length === candidate.length && crypto.timingSafeEqual(original, candidate);
}

function createEmailCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function currentUser(req) {
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

function getEntityConfig(entityName) {
  const config = entityConfig[entityName];
  if (!config) {
    const error = new Error(`Unknown entity: ${entityName}`);
    error.status = 404;
    throw error;
  }
  return config;
}

function parseSort(sort) {
  if (!sort) return 'created_date DESC';
  const descending = sort.startsWith('-');
  const column = descending ? sort.slice(1) : sort;
  if (!/^[a-z_]+$/.test(column)) return 'created_date DESC';
  return `${column} ${descending ? 'DESC' : 'ASC'}`;
}


app.get('/api/health', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', async (_req, res, next) => {
  try {
    res.json(serialize(await currentUser(_req)));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const nickname = String(req.body?.nickname || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }
    if (!isValidNickname(nickname)) {
      res.status(400).json({ error: 'Nickname must be 3-20 English letters, numbers, or underscores, and start with a letter.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = await query('SELECT id FROM app_users WHERE lower(email) = $1 OR lower(nickname) = $2', [email, nickname.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email or nickname is already registered.' });
      return;
    }

    const result = await query(
      `INSERT INTO app_users (email, nickname, name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nickname, name, created_date, updated_date`,
      [email, nickname, nickname, hashPassword(password)]
    );
    res.status(201).json(serialize(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/request-code', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const nickname = String(req.body?.nickname || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }
    if (!isValidNickname(nickname)) {
      res.status(400).json({ error: 'Nickname must be 3-20 English letters, numbers, or underscores, and start with a letter.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = await query('SELECT id FROM app_users WHERE lower(email) = $1 OR lower(nickname) = $2', [email, nickname.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email or nickname is already registered.' });
      return;
    }

    const code = createEmailCode();
    pendingEmailCodes.set(email, {
      code,
      nickname,
      passwordHash: hashPassword(password),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    console.log(`NutriAI verification code for ${email}: ${code}`);
    res.json({
      ok: true,
      message: 'Verification code created.',
      dev_code: process.env.NODE_ENV === 'production' ? undefined : code,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-register', async (req, res, next) => {
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

    const result = await query(
      `INSERT INTO app_users (email, nickname, name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nickname, name, created_date, updated_date`,
      [email, pending.nickname, pending.nickname, pending.passwordHash]
    );
    pendingEmailCodes.delete(email);
    res.status(201).json(serialize(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const identifier = String(req.body?.identifier || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!identifier || !password) {
      res.status(400).json({ error: 'Nickname/email and password are required.' });
      return;
    }

    const result = await query(
      `SELECT id, email, nickname, name, password_hash, created_date, updated_date
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

    const { password_hash, ...safeUser } = user;
    res.json(serialize(safeUser));
  } catch (error) {
    next(error);
  }
});

app.get('/api/entities/:entityName', async (req, res, next) => {
  try {
    const config = getEntityConfig(req.params.entityName);
    const user = await currentUser(req);
    const reserved = new Set(['sort', 'limit']);
    const params = [user.id];
    const clauses = ['user_id = $1'];

    for (const [key, value] of Object.entries(req.query)) {
      if (reserved.has(key) || !config.columns.includes(key)) continue;
      params.push(value);
      clauses.push(`${key} = $${params.length}`);
    }

    const limit = Math.min(Number(req.query.limit || 100), 500);
    params.push(limit);

    const result = await query(
      `SELECT * FROM ${config.table}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${parseSort(req.query.sort)}
       LIMIT $${params.length}`,
      params
    );

    res.json(result.rows.map(serialize));
  } catch (error) {
    next(error);
  }
});

app.post('/api/entities/:entityName', async (req, res, next) => {
  try {
    const config = getEntityConfig(req.params.entityName);
    const user = await currentUser(req);
    const data = req.body || {};
    const columns = config.columns.filter((column) => data[column] !== undefined);
    const jsonColumns = new Set(config.jsonColumns || []);
    const values = columns.map((column) => jsonColumns.has(column) ? JSON.stringify(data[column] ?? []) : data[column]);
    const placeholders = columns.map((column, index) => `$${index + 2}${jsonColumns.has(column) ? '::jsonb' : ''}`);

    let sql = `INSERT INTO ${config.table} (user_id${columns.length ? `, ${columns.join(', ')}` : ''})
      VALUES ($1${placeholders.length ? `, ${placeholders.join(', ')}` : ''})`;

    if (config.uniqueBy && data[config.uniqueBy] !== undefined) {
      const updateSet = columns
        .filter((column) => column !== config.uniqueBy)
        .map((column) => `${column} = EXCLUDED.${column}`)
        .concat('updated_date = now()')
        .join(', ');
      sql += ` ON CONFLICT (user_id, ${config.uniqueBy}) DO UPDATE SET ${updateSet}`;
    }

    sql += ' RETURNING *';

    const result = await query(sql, [user.id, ...values]);
    res.status(201).json(serialize(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put('/api/entities/:entityName/:id', async (req, res, next) => {
  try {
    const config = getEntityConfig(req.params.entityName);
    const user = await currentUser(req);
    const data = req.body || {};
    const columns = config.columns.filter((column) => data[column] !== undefined);
    const jsonColumns = new Set(config.jsonColumns || []);

    if (columns.length === 0) {
      res.status(400).json({ error: 'No valid fields to update.' });
      return;
    }

    const values = columns.map((column) => jsonColumns.has(column) ? JSON.stringify(data[column] ?? []) : data[column]);
    const setSql = columns.map((column, index) => `${column} = $${index + 3}${jsonColumns.has(column) ? '::jsonb' : ''}`).join(', ');
    const result = await query(
      `UPDATE ${config.table}
       SET ${setSql}, updated_date = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, user.id, ...values]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }

    res.json(serialize(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/entities/:entityName/:id', async (req, res, next) => {
  try {
    const config = getEntityConfig(req.params.entityName);
    const user = await currentUser(req);
    await query(`DELETE FROM ${config.table} WHERE id = $1 AND user_id = $2`, [req.params.id, user.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/files', upload.single('file'), (req, res) => {
  const fileUrl = `/uploads/${req.file.filename}`;
  uploadedFiles.set(fileUrl, {
    path: req.file.path,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
  });
  res.status(201).json({ file_url: fileUrl });
});

app.post('/api/ai/invoke', async (req, res, next) => {
  const payload = req.body || {};

  try {
    res.json(await nutritionService.invoke(payload, aiService));
  } catch (error) {
    if (nutritionService.canFallback(payload)) {
      console.warn('AI invoke fallback:', error.message || error);
      res.json(nutritionService.fallback(payload));
      return;
    }
    next(error);
  }
});


if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'Server error' });
});

const server = app.listen(port, () => {
  console.log(`NutriAI backend listening on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  server.close();
  await pool.end();
  process.exit(0);
});
