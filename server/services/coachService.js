import crypto from 'node:crypto';
import { query } from '../db.js';
import { serialize } from '../utils/serialize.js';

export const DEFAULT_COACH_PERMISSIONS = {
  nutrition: true,
  water: true,
  weight: true,
  plan: true,
  history: true,
  notes: true,
};

const PERMISSION_KEYS = Object.keys(DEFAULT_COACH_PERMISSIONS);

function normalizePermissions(input = {}, fallback = DEFAULT_COACH_PERMISSIONS) {
  return PERMISSION_KEYS.reduce((permissions, key) => {
    permissions[key] = typeof input[key] === 'boolean' ? input[key] : Boolean(fallback[key]);
    return permissions;
  }, {});
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(date) {
  const value = String(date || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso();
}

function publicUser(row = {}) {
  return {
    id: row.client_id || row.id,
    email: row.email,
    nickname: row.nickname,
    name: row.name,
  };
}

function makeInviteCode() {
  return `NAI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function hasCoachRole(user) {
  return user?.role === 'coach' || user?.role === 'admin';
}

function forbidden(message = 'Coach access required.') {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function notFound(message = 'Record not found.') {
  const error = new Error(message);
  error.status = 404;
  return error;
}

async function latestProfile(userId) {
  const result = await query(
    `SELECT *
     FROM user_profiles
     WHERE user_id = $1
     ORDER BY updated_date DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ? serialize(result.rows[0]) : null;
}

async function todayFoodSummary(userId, date) {
  const result = await query(
    `SELECT
       COALESCE(sum(total_calories), 0) AS total_calories,
       COALESCE(sum(total_proteins), 0) AS total_proteins,
       COALESCE(sum(total_fats), 0) AS total_fats,
       COALESCE(sum(total_carbs), 0) AS total_carbs
     FROM food_logs
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  return serialize(result.rows[0]);
}

async function todayFoodLogs(userId, date) {
  const result = await query(
    `SELECT *
     FROM food_logs
     WHERE user_id = $1 AND date = $2
     ORDER BY created_date DESC`,
    [userId, date]
  );
  return result.rows.map(serialize);
}

async function todayWaterSummary(userId, date) {
  const result = await query(
    `SELECT COALESCE(sum(amount_ml), 0) AS amount_ml
     FROM water_logs
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  return serialize(result.rows[0]);
}

async function latestWeight(userId) {
  const result = await query(
    `SELECT *
     FROM weight_logs
     WHERE user_id = $1
     ORDER BY date DESC, created_date DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ? serialize(result.rows[0]) : null;
}

async function recentWeightLogs(userId) {
  const result = await query(
    `SELECT *
     FROM weight_logs
     WHERE user_id = $1
     ORDER BY date DESC, created_date DESC
     LIMIT 30`,
    [userId]
  );
  return result.rows.map(serialize);
}

async function recentFoodHistory(userId) {
  const result = await query(
    `SELECT
       date,
       COALESCE(sum(total_calories), 0) AS total_calories,
       COALESCE(sum(total_proteins), 0) AS total_proteins,
       COALESCE(sum(total_fats), 0) AS total_fats,
       COALESCE(sum(total_carbs), 0) AS total_carbs
     FROM food_logs
     WHERE user_id = $1
     GROUP BY date
     ORDER BY date DESC
     LIMIT 14`,
    [userId]
  );
  return result.rows.map(serialize);
}

async function recentWaterHistory(userId) {
  const result = await query(
    `SELECT date, COALESCE(sum(amount_ml), 0) AS amount_ml
     FROM water_logs
     WHERE user_id = $1
     GROUP BY date
     ORDER BY date DESC
     LIMIT 14`,
    [userId]
  );
  return result.rows.map(serialize);
}

async function latestMealPlan(userId) {
  const result = await query(
    `SELECT *
     FROM meal_plans
     WHERE user_id = $1
     ORDER BY updated_date DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ? serialize(result.rows[0]) : null;
}

async function coachNotes(coachId, clientId) {
  const result = await query(
    `SELECT *
     FROM coach_notes
     WHERE coach_user_id = $1 AND client_user_id = $2
     ORDER BY created_date DESC
     LIMIT 30`,
    [coachId, clientId]
  );
  return result.rows.map(serialize);
}

function buildNutritionAdherence({ food, profile }) {
  const goal = Number(profile?.daily_calories || 0);
  const calories = Number(food?.total_calories || 0);
  if (!goal) {
    return { ratio: 0, status: 'no_goal', label: 'Немає норми' };
  }
  const ratio = calories / goal;
  if (ratio < 0.5) return { ratio, status: 'low', label: 'Критичний недобір' };
  if (ratio < 0.8) return { ratio, status: 'medium', label: 'Недобір' };
  if (ratio <= 1.05) return { ratio, status: 'good', label: 'В нормі' };
  return { ratio, status: 'over', label: 'Перебір' };
}

function matchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenMealPlanMeals(mealPlan) {
  const payload = mealPlan?.plan || {};
  const selectedIds = new Set(Array.isArray(payload.selectedMeals) ? payload.selectedMeals : []);
  const meals = (payload.days || []).flatMap((day, dayIndex) =>
    (day.meals || []).map((meal) => ({
      id: meal.id,
      day: day.day || `Day ${dayIndex + 1}`,
      slot: meal.slot,
      title: meal.title || meal.name || 'Meal',
      calories: Number(meal.calories || 0),
    }))
  );

  return selectedIds.size ? meals.filter((meal) => selectedIds.has(meal.id)) : [];
}

function foodLogHaystack(foodLogs = []) {
  return matchText(
    foodLogs
      .flatMap((log) => [
        log.description,
        ...(Array.isArray(log.items) ? log.items.map((item) => item.name || item.title || item.description) : []),
      ])
      .filter(Boolean)
      .join(' ')
  );
}

function mealMatchesFoodLog(meal, haystack) {
  const title = matchText(meal.title);
  if (!title || !haystack) return false;
  if (haystack.includes(title)) return true;

  const importantWords = title
    .split(' ')
    .filter((word) => word.length >= 4)
    .slice(0, 4);
  if (importantWords.length === 0) return false;
  return importantWords.filter((word) => haystack.includes(word)).length >= Math.min(2, importantWords.length);
}

function buildPlanAdherence({ mealPlan, foodLogs }) {
  if (!mealPlan?.plan?.days?.length) {
    return { ratio: 0, status: 'no_plan', label: 'Плану ще немає', selected_count: 0, matched_count: 0, selected_meals: [], matched_meals: [] };
  }

  const selectedMeals = flattenMealPlanMeals(mealPlan);
  if (!selectedMeals.length) {
    return { ratio: 0, status: 'no_selection', label: 'Страви не обрані', selected_count: 0, matched_count: 0, selected_meals: [], matched_meals: [] };
  }

  const haystack = foodLogHaystack(foodLogs);
  const matchedMeals = selectedMeals.filter((meal) => mealMatchesFoodLog(meal, haystack));
  const ratio = matchedMeals.length / selectedMeals.length;
  let status = 'low';
  let label = 'План майже не виконано';
  if (!haystack) {
    status = 'no_logs';
    label = 'Ще немає записів їжі';
  } else if (ratio >= 0.8) {
    status = 'good';
    label = 'План виконується';
  } else if (ratio >= 0.4) {
    status = 'partial';
    label = 'Частково за планом';
  }

  return {
    ratio,
    status,
    label,
    selected_count: selectedMeals.length,
    matched_count: matchedMeals.length,
    selected_meals: selectedMeals.slice(0, 8),
    matched_meals: matchedMeals.slice(0, 8),
  };
}

async function buildClientView({ coachId, relationship, client, date, detail = false }) {
  const permissions = normalizePermissions(relationship.permissions);
  const profile = await latestProfile(client.id);
  const food = permissions.nutrition ? await todayFoodSummary(client.id, date) : null;
  const mealPlan = permissions.plan ? await latestMealPlan(client.id) : null;
  const needsFoodLogs = permissions.nutrition && (detail || permissions.plan);
  const foodLogs = needsFoodLogs ? await todayFoodLogs(client.id, date) : [];
  const water = permissions.water ? await todayWaterSummary(client.id, date) : null;
  const weight = permissions.weight ? await latestWeight(client.id) : null;
  const nutritionAdherence = permissions.nutrition ? buildNutritionAdherence({ food, profile }) : null;
  const planAdherence = permissions.plan && permissions.nutrition
    ? buildPlanAdherence({ mealPlan, foodLogs })
    : null;

  const view = {
    relationship: serialize({
      id: relationship.relationship_id || relationship.id,
      status: relationship.status,
      connected_date: relationship.connected_date,
      disconnected_date: relationship.disconnected_date,
      permissions,
    }),
    client: publicUser(client),
    profile,
    today: {
      date,
      nutrition: food,
      water,
      weight,
      adherence: nutritionAdherence,
      nutrition_adherence: nutritionAdherence,
      plan_adherence: planAdherence,
    },
  };

  if (detail) {
    view.food_logs = permissions.nutrition ? foodLogs : [];
    view.weight_logs = permissions.weight ? await recentWeightLogs(client.id) : [];
    view.meal_plan = mealPlan;
    view.history = permissions.history
      ? {
          food: permissions.nutrition ? await recentFoodHistory(client.id) : [],
          water: permissions.water ? await recentWaterHistory(client.id) : [],
        }
      : { food: [], water: [] };
    view.notes = permissions.notes ? await coachNotes(coachId, client.id) : [];
  }

  return view;
}

export class CoachService {
  assertCoach(user) {
    if (!hasCoachRole(user)) throw forbidden();
  }

  async upsertProfile(user, data = {}) {
    this.assertCoach(user);
    const displayName = String(data.display_name || user.nickname || user.name || '').trim();
    const bio = String(data.bio || '').trim();
    const result = await query(
      `INSERT INTO coach_profiles (coach_user_id, display_name, bio)
       VALUES ($1, $2, $3)
       ON CONFLICT (coach_user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         bio = EXCLUDED.bio,
         updated_date = now()
       RETURNING *`,
      [user.id, displayName, bio]
    );
    return serialize(result.rows[0]);
  }

  async getProfile(user) {
    if (!hasCoachRole(user)) return null;
    const result = await query('SELECT * FROM coach_profiles WHERE coach_user_id = $1 LIMIT 1', [user.id]);
    return result.rows[0] ? serialize(result.rows[0]) : null;
  }

  async createInvite(user, data = {}) {
    this.assertCoach(user);
    await this.upsertProfile(user, data.profile || {});
    const expiresDays = Math.min(Math.max(Number(data.expires_days || 14), 1), 90);
    const maxUses = Math.min(Math.max(Number(data.max_uses || 20), 1), 200);
    const code = makeInviteCode();
    const result = await query(
      `INSERT INTO coach_invites (coach_user_id, code, max_uses, expires_at)
       VALUES ($1, $2, $3, now() + ($4::text || ' days')::interval)
       RETURNING *`,
      [user.id, code, maxUses, expiresDays]
    );
    return serialize(result.rows[0]);
  }

  async listInvites(user) {
    this.assertCoach(user);
    const result = await query(
      `SELECT *
       FROM coach_invites
       WHERE coach_user_id = $1
       ORDER BY created_date DESC
       LIMIT 20`,
      [user.id]
    );
    return result.rows.map(serialize);
  }

  async revokeInvite(user, inviteId) {
    this.assertCoach(user);
    const result = await query(
      `UPDATE coach_invites
       SET status = 'revoked', updated_date = now()
       WHERE id = $1 AND coach_user_id = $2
       RETURNING *`,
      [inviteId, user.id]
    );
    if (!result.rows[0]) throw notFound('Invite not found.');
    return serialize(result.rows[0]);
  }

  async connectWithInvite(clientUser, code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    const inviteResult = await query(
      `SELECT ci.*, au.nickname AS coach_nickname, au.name AS coach_name, au.email AS coach_email
       FROM coach_invites ci
       JOIN app_users au ON au.id = ci.coach_user_id
       WHERE ci.code = $1
       LIMIT 1`,
      [cleanCode]
    );
    const invite = inviteResult.rows[0];
    if (!invite || invite.status !== 'active') throw notFound('Invite code is invalid.');
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      throw notFound('Invite code has expired.');
    }
    if (Number(invite.used_count || 0) >= Number(invite.max_uses || 0)) {
      throw forbidden('Invite code has reached its usage limit.');
    }
    if (invite.coach_user_id === clientUser.id) {
      throw forbidden('Coach cannot invite themselves.');
    }

    const relationshipResult = await query(
      `INSERT INTO coach_clients (coach_user_id, client_user_id, status, permissions, connected_date, disconnected_date)
       VALUES ($1, $2, 'active', $3::jsonb, now(), NULL)
       ON CONFLICT (coach_user_id, client_user_id) DO UPDATE SET
         status = 'active',
         permissions = COALESCE(coach_clients.permissions, EXCLUDED.permissions),
         connected_date = now(),
         disconnected_date = NULL,
         updated_date = now()
       RETURNING *`,
      [invite.coach_user_id, clientUser.id, JSON.stringify(DEFAULT_COACH_PERMISSIONS)]
    );

    await query(
      `UPDATE coach_invites
       SET used_count = used_count + 1, updated_date = now()
       WHERE id = $1`,
      [invite.id]
    );

    return {
      relationship: serialize(relationshipResult.rows[0]),
      coach: {
        id: invite.coach_user_id,
        email: invite.coach_email,
        nickname: invite.coach_nickname,
        name: invite.coach_name,
      },
    };
  }

  async listMyCoaches(clientUser) {
    const result = await query(
      `SELECT
         cc.*,
         au.id AS coach_id,
         au.email AS coach_email,
         au.nickname AS coach_nickname,
         au.name AS coach_name,
         cp.display_name AS coach_display_name,
         cp.bio AS coach_bio
       FROM coach_clients cc
       JOIN app_users au ON au.id = cc.coach_user_id
       LEFT JOIN coach_profiles cp ON cp.coach_user_id = cc.coach_user_id
       WHERE cc.client_user_id = $1 AND cc.status = 'active'
       ORDER BY cc.updated_date DESC`,
      [clientUser.id]
    );

    return result.rows.map((row) => ({
      relationship: serialize({
        id: row.id,
        status: row.status,
        connected_date: row.connected_date,
        permissions: normalizePermissions(row.permissions),
      }),
      coach: {
        id: row.coach_id,
        email: row.coach_email,
        nickname: row.coach_nickname,
        name: row.coach_display_name || row.coach_name,
        bio: row.coach_bio,
      },
    }));
  }

  async updateMyCoachPermissions(clientUser, relationshipId, permissions) {
    const current = await query(
      `SELECT permissions
       FROM coach_clients
       WHERE id = $1 AND client_user_id = $2 AND status = 'active'
       LIMIT 1`,
      [relationshipId, clientUser.id]
    );
    if (!current.rows[0]) throw notFound('Coach connection not found.');

    const normalized = normalizePermissions(permissions, current.rows[0].permissions);
    const result = await query(
      `UPDATE coach_clients
       SET permissions = $3::jsonb, updated_date = now()
       WHERE id = $1 AND client_user_id = $2
       RETURNING *`,
      [relationshipId, clientUser.id, JSON.stringify(normalized)]
    );
    return serialize(result.rows[0]);
  }

  async disconnectMyCoach(clientUser, relationshipId) {
    const result = await query(
      `UPDATE coach_clients
       SET status = 'disconnected', disconnected_date = now(), updated_date = now()
       WHERE id = $1 AND client_user_id = $2
       RETURNING *`,
      [relationshipId, clientUser.id]
    );
    if (!result.rows[0]) throw notFound('Coach connection not found.');
    return serialize(result.rows[0]);
  }

  async listClients(user, dateInput) {
    this.assertCoach(user);
    const date = normalizeDate(dateInput);
    const result = await query(
      `SELECT
         cc.id AS relationship_id,
         cc.status,
         cc.permissions,
         cc.connected_date,
         cc.disconnected_date,
         au.id AS client_id,
         au.email,
         au.nickname,
         au.name
       FROM coach_clients cc
       JOIN app_users au ON au.id = cc.client_user_id
       WHERE cc.coach_user_id = $1 AND cc.status = 'active'
       ORDER BY cc.updated_date DESC`,
      [user.id]
    );

    return Promise.all(
      result.rows.map((row) =>
        buildClientView({
          coachId: user.id,
          relationship: row,
          client: publicUser(row),
          date,
          detail: false,
        })
      )
    );
  }

  async getClientDetail(user, clientId, dateInput) {
    this.assertCoach(user);
    const date = normalizeDate(dateInput);
    const result = await query(
      `SELECT
         cc.id AS relationship_id,
         cc.status,
         cc.permissions,
         cc.connected_date,
         cc.disconnected_date,
         au.id AS client_id,
         au.email,
         au.nickname,
         au.name
       FROM coach_clients cc
       JOIN app_users au ON au.id = cc.client_user_id
       WHERE cc.coach_user_id = $1 AND cc.client_user_id = $2 AND cc.status = 'active'
       LIMIT 1`,
      [user.id, clientId]
    );
    const row = result.rows[0];
    if (!row) throw notFound('Client is not connected to this coach.');

    return buildClientView({
      coachId: user.id,
      relationship: row,
      client: publicUser(row),
      date,
      detail: true,
    });
  }

  async addNote(user, clientId, note) {
    this.assertCoach(user);
    const relationship = await query(
      `SELECT permissions
       FROM coach_clients
       WHERE coach_user_id = $1 AND client_user_id = $2 AND status = 'active'
       LIMIT 1`,
      [user.id, clientId]
    );
    if (!relationship.rows[0]) throw notFound('Client is not connected to this coach.');
    if (!normalizePermissions(relationship.rows[0].permissions).notes) {
      throw forbidden('Client disabled coach notes.');
    }

    const cleanNote = String(note || '').trim();
    if (!cleanNote) {
      const error = new Error('Note text is required.');
      error.status = 400;
      throw error;
    }

    const result = await query(
      `INSERT INTO coach_notes (coach_user_id, client_user_id, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.id, clientId, cleanNote.slice(0, 2000)]
    );
    return serialize(result.rows[0]);
  }

  async deleteNote(user, noteId) {
    this.assertCoach(user);
    const result = await query(
      `DELETE FROM coach_notes
       WHERE id = $1 AND coach_user_id = $2
       RETURNING *`,
      [noteId, user.id]
    );
    if (!result.rows[0]) throw notFound('Note not found.');
    return serialize(result.rows[0]);
  }
}
