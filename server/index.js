import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, query } from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

await fs.mkdir(uploadsDir, { recursive: true });

const upload = multer({ dest: uploadsDir });
const uploadedFiles = new Map();
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

function createFallbackFromSchema(schema, prompt = '') {
  const props = schema?.properties || {};

  if (props.products) {
    const nameMatch = prompt.match(/"([^"]+)"/);
    const name = nameMatch?.[1] || 'Продукт';
    return {
      products: [
        { name, serving_label: '100 г', weight_g: 100, calories: 200, proteins: 8, fats: 6, carbs: 28, ingredients: 'Орієнтовні значення' },
      ],
    };
  }

  if (props.days) {
    const meals = [
      { meal_type: 'breakfast', name: 'Вівсянка з фруктами', description: 'Збалансований сніданок', calories: 430, proteins: 18, fats: 12, carbs: 62 },
      { meal_type: 'lunch', name: 'Курка з гречкою', description: 'Білкова основа з крупою', calories: 620, proteins: 42, fats: 18, carbs: 68 },
      { meal_type: 'dinner', name: 'Риба з овочами', description: 'Легка вечеря', calories: 480, proteins: 36, fats: 20, carbs: 34 },
      { meal_type: 'snack', name: 'Йогурт з горіхами', description: 'Перекус між прийомами їжі', calories: 230, proteins: 14, fats: 12, carbs: 18 },
    ];
    return { days: Array.from({ length: 7 }, (_, i) => ({ day: `День ${i + 1}`, meals, total_calories: 1760 })) };
  }

  if (props.categories) {
    return {
      categories: [
        { name: 'Овочі та фрукти', emoji: '🥦', items: [{ name: 'Овочі для салату', amount: '1-2 кг' }] },
        { name: "М'ясо та риба", emoji: '🍗', items: [{ name: 'Куряче філе', amount: '700 г' }] },
        { name: 'Крупи та злаки', emoji: '🌾', items: [{ name: 'Гречка або рис', amount: '500 г' }] },
      ],
    };
  }

  if (props.title && props.tasks) {
    return {
      title: 'Тиждень стабільності',
      description: 'Маленький виклик для рівного прогресу.',
      emoji: '🎯',
      tasks: ['Записувати кожен прийом їжі', 'Випивати норму води', 'Додати білок у кожен основний прийом', 'Зробити 20 хвилин руху', 'Підбити підсумок дня'],
    };
  }

  if (props.name && props.brand) {
    return { name: 'Продукт', brand: '', serving_label: '100 г', weight_g: 100, calories: 200, proteins: 8, fats: 6, carbs: 28 };
  }

  if (props.total_calories) {
    return {
      description: 'Орієнтовний прийом їжі',
      total_calories: 350,
      total_proteins: 20,
      total_fats: 12,
      total_carbs: 38,
      ai_tip: 'Значення приблизні. За потреби уточніть вагу або спосіб приготування.',
      items: [{ name: 'Їжа', weight_g: 250, calories: 350, proteins: 20, fats: 12, carbs: 38 }],
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return 'Gemini тимчасово не відповів. Спробуйте ще раз або уточніть запит.';
  }

  return 'AI-підказка тимчасово працює у fallback-режимі. Додайте GEMINI_API_KEY, щоб отримувати персональні відповіді.';
}

const nutritionFallbacks = [
  { pattern: /dill|parsley|herb|кр[іи]п|укроп|петруш|зелень|базил|кінз/i, item: { calories: 43, proteins: 3.5, fats: 1.1, carbs: 7 }, category: 'herb' },
  { pattern: /minced|ground|фарш|свин|ялов|говяд|beef|pork/i, item: { calories: 250, proteins: 17, fats: 20, carbs: 0 }, category: 'meat' },
  { pattern: /cream|вершк|сливоч|cheese sauce|сирн.*соус|соус/i, item: { calories: 220, proteins: 3, fats: 20, carbs: 4 }, category: 'sauce' },
  { pattern: /apple|яблу/i, item: { calories: 52, proteins: 0.3, fats: 0.2, carbs: 14 } },
  { pattern: /banana|банан/i, item: { calories: 89, proteins: 1.1, fats: 0.3, carbs: 23 } },
  { pattern: /rice|рис/i, item: { calories: 130, proteins: 2.7, fats: 0.3, carbs: 28 } },
  { pattern: /chicken|кур/i, item: { calories: 165, proteins: 31, fats: 3.6, carbs: 0 }, category: 'meat' },
  { pattern: /egg|яйц/i, item: { calories: 155, proteins: 13, fats: 11, carbs: 1.1 } },
  { pattern: /bread|хліб/i, item: { calories: 250, proteins: 8, fats: 3, carbs: 49 } },
  { pattern: /potato|картоп/i, item: { calories: 77, proteins: 2, fats: 0.1, carbs: 17 } },
  { pattern: /salad|салат/i, item: { calories: 70, proteins: 2, fats: 4, carbs: 8 } },
  { pattern: /pasta|penne|паста|пенне|макарон/i, item: { calories: 155, proteins: 5.8, fats: 0.9, carbs: 31 }, category: 'starch' },
  { pattern: /fish|риба|лосос|тунец/i, item: { calories: 180, proteins: 22, fats: 9, carbs: 0 }, category: 'meat' },
];

const defaultNutrition = { calories: 160, proteins: 7, fats: 6, carbs: 18 };

function nutritionMatch(name = '') {
  return nutritionFallbacks.find((entry) => entry.pattern.test(name));
}

function estimateNutritionForName(name = '', weight = 150) {
  const match = nutritionMatch(name);
  const per100 = match?.item || defaultNutrition;
  const ratio = Math.max(Number(weight) || 150, 1) / 100;
  return {
    calories: Math.round(per100.calories * ratio),
    proteins: Math.round(per100.proteins * ratio * 10) / 10,
    fats: Math.round(per100.fats * ratio * 10) / 10,
    carbs: Math.round(per100.carbs * ratio * 10) / 10,
  };
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function realisticWeight(name = '', value) {
  const weight = cleanNumber(value);
  if (weight && weight > 0) return weight;
  const category = nutritionMatch(name)?.category;
  if (category === 'herb') return 3;
  if (category === 'sauce') return 50;
  if (category === 'meat') return 100;
  if (category === 'starch') return 150;
  return 150;
}

function maybeReplaceImpossibleItem(item) {
  const match = nutritionMatch(item.name);
  const category = match?.category;
  const estimate = estimateNutritionForName(item.name, item.weight_g);
  const maxPossibleCalories = Math.max(item.weight_g * 9, 1);
  const caloriesPer100 = item.weight_g > 0 ? (item.calories / item.weight_g) * 100 : 0;
  const fatsPer100 = item.weight_g > 0 ? (item.fats / item.weight_g) * 100 : 0;
  const carbsPer100 = item.weight_g > 0 ? (item.carbs / item.weight_g) * 100 : 0;
  const proteinsPer100 = item.weight_g > 0 ? (item.proteins / item.weight_g) * 100 : 0;

  const impossibleCalories =
    item.calories > maxPossibleCalories ||
    caloriesPer100 > 900 ||
    (category === 'herb' && item.weight_g <= 10 && item.calories > 10);

  const impossibleMacros =
    item.proteins + item.fats + item.carbs > item.weight_g * 1.35 ||
    (category === 'herb' && item.weight_g <= 10 && (item.proteins > 1 || item.fats > 1 || item.carbs > 2));

  if (impossibleCalories || impossibleMacros) {
    return { ...item, ...estimate };
  }

  if (category === 'meat' && !/соус|sauce|пані|bread|batter|кляр/i.test(item.name) && item.carbs > item.weight_g * 0.08) {
    return { ...item, carbs: 0 };
  }

  if (category === 'sauce' && /cream|вершк|сливоч|сирн/i.test(item.name) && (fatsPer100 < 8 || carbsPer100 > 15)) {
    return { ...item, ...estimate };
  }

  if (category === 'starch' && /pasta|penne|паста|пенне|макарон/i.test(item.name) && (fatsPer100 > 5 || carbsPer100 < 20 || proteinsPer100 > 12)) {
    return { ...item, ...estimate };
  }

  return item;
}

function normalizeNutritionResult(result, prompt = '') {
  if (!result || typeof result !== 'object' || !('total_calories' in result || 'items' in result)) return result;

  let items = Array.isArray(result.items) ? result.items : [];
  if (items.length === 0) {
    const nameMatch = prompt.match(/"([^"]+)"/);
    items = [{ name: nameMatch?.[1] || result.description || 'Страва', weight_g: 150 }];
  }

  const normalizedItems = items.map((item) => {
    const name = item.name || 'Продукт';
    const weight = realisticWeight(name, item.weight_g);
    const estimated = estimateNutritionForName(name, weight);
    const normalized = {
      ...item,
      name,
      weight_g: weight,
      calories: cleanNumber(item.calories) ?? estimated.calories,
      proteins: cleanNumber(item.proteins) ?? estimated.proteins,
      fats: cleanNumber(item.fats) ?? estimated.fats,
      carbs: cleanNumber(item.carbs) ?? estimated.carbs,
    };
    return maybeReplaceImpossibleItem(normalized);
  });

  const totals = normalizedItems.reduce((acc, item) => ({
    calories: acc.calories + (Number(item.calories) || 0),
    proteins: acc.proteins + (Number(item.proteins) || 0),
    fats: acc.fats + (Number(item.fats) || 0),
    carbs: acc.carbs + (Number(item.carbs) || 0),
  }), { calories: 0, proteins: 0, fats: 0, carbs: 0 });

  return {
    ...result,
    items: normalizedItems,
    total_calories: Math.round(totals.calories),
    total_proteins: Math.round(totals.proteins * 10) / 10,
    total_fats: Math.round(totals.fats * 10) / 10,
    total_carbs: Math.round(totals.carbs * 10) / 10,
    ai_tip: result.ai_tip || 'КБЖУ оцінено AI приблизно та перевірено на реалістичність. За потреби можна відредагувати вручну.',
  };
}

function extractGeminiText(data) {
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim() || '';
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON.');
    return JSON.parse(match[0]);
  }
}

async function getUploadedParts(payload, format) {
  const uploaded = (payload.file_urls || [])
    .map((fileUrl) => uploadedFiles.get(fileUrl))
    .filter(Boolean);

  const parts = [];
  for (const file of uploaded) {
    const bytes = await fs.readFile(file.path);
    const data = bytes.toString('base64');

    if (format === 'gemini') {
      parts.push({
        inline_data: {
          mime_type: file.mimetype,
          data,
        },
      });
    } else if (file.mimetype?.startsWith('image/')) {
      parts.push({
        type: 'image_url',
        image_url: {
          url: `data:${file.mimetype};base64,${data}`,
        },
      });
    }
  }

  return parts;
}

async function invokeGemini(payload) {
  if (!process.env.GEMINI_API_KEY) return null;

  const schema = payload.response_json_schema;
  const wantsJson = Boolean(schema);
  const isNutritionSchema = wantsJson && schema?.properties?.total_calories && schema?.properties?.items;
  const nutritionInstructions = isNutritionSchema
    ? `\n\nNutrition rules:
- Estimate visible/mentioned food weight in grams before calculating calories and macros.
- Use realistic nutrition values per 100g, as a dietitian would from food tables.
- Never output impossible values: calories cannot exceed 9 kcal per gram, and macros cannot weigh more than the item.
- Meat, fish and plain minced meat usually have 0g carbs unless breaded, battered, or mixed with sauce.
- Cooked pasta is usually about 150-170 kcal per 100g with mostly carbs.
- Cream/cheese sauce is usually fat-heavy and only a few carbs.
- Herbs/garnish under 10g are nutritionally tiny, usually 0-5 kcal total.
- If unsure, give a conservative realistic estimate, not 0 and not a placeholder.`
    : '';
  const parts = [
    {
      text: `${payload.prompt || ''}${nutritionInstructions}${wantsJson ? '\n\nReturn only valid JSON matching the requested schema.' : ''}`,
    },
    ...(await getUploadedParts(payload, 'gemini')),
  ];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      ...(wantsJson
        ? {
            responseMimeType: 'application/json',
          }
        : {}),
    },
  };

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini request failed: ${text}`);
  }

  const data = await response.json();
  const text = extractGeminiText(data);
  return wantsJson ? parseMaybeJson(text) : text;
}

async function invokeOpenAI(payload) {
  if (!process.env.OPENAI_API_KEY) return null;

  const schema = payload.response_json_schema;
  const wantsJson = Boolean(schema);
  const uploaded = (payload.file_urls || [])
    .map((fileUrl) => uploadedFiles.get(fileUrl))
    .filter(Boolean);

  const audio = uploaded.find((file) => file.mimetype?.startsWith('audio/'));
  if (audio) {
    const form = new FormData();
    const bytes = await fs.readFile(audio.path);
    form.append('file', new Blob([bytes], { type: audio.mimetype }), audio.originalname || 'audio.webm');
    form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI transcription failed: ${text}`);
    }

    const data = await response.json();
    return data.text || '';
  }

  const imageContent = await getUploadedParts(payload, 'openai');

  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: wantsJson ? 'Return only valid JSON matching the requested schema.' : 'Answer concisely in Ukrainian.' },
      {
        role: 'user',
        content: imageContent.length
          ? [{ type: 'text', text: payload.prompt || '' }, ...imageContent]
          : payload.prompt || '',
      },
    ],
    temperature: 0.2,
  };

  if (wantsJson) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'nutriai_response',
        schema,
        strict: false,
      },
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return wantsJson ? JSON.parse(content) : content;
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
  try {
    const payload = req.body || {};
    const result = (await invokeGemini(payload)) || (await invokeOpenAI(payload)) || createFallbackFromSchema(payload.response_json_schema, payload.prompt);
    res.json(normalizeNutritionResult(result, payload.prompt));
  } catch (error) {
    if (payloadAllowsFallback(req.body)) {
      console.warn('AI invoke fallback:', error.message || error);
      res.json(normalizeNutritionResult(createFallbackFromSchema(req.body.response_json_schema, req.body.prompt), req.body.prompt));
      return;
    }
    next(error);
  }
});

function payloadAllowsFallback(payload) {
  return Boolean(payload?.response_json_schema || payload?.prompt);
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
