import { getEntityConfig } from '../config/entityConfig.js';
import { query } from '../db.js';

function parseSort(sort) {
  if (!sort) return 'created_date DESC';
  const descending = sort.startsWith('-');
  const column = descending ? sort.slice(1) : sort;
  if (!/^[a-z_]+$/.test(column)) return 'created_date DESC';
  return `${column} ${descending ? 'DESC' : 'ASC'}`;
}

export class EntityRepository {
  async list(entityName, userId, queryParams = {}) {
    const config = getEntityConfig(entityName);
    const reserved = new Set(['sort', 'limit']);
    const params = [userId];
    const clauses = ['user_id = $1'];

    for (const [key, value] of Object.entries(queryParams)) {
      if (reserved.has(key) || !config.columns.includes(key)) continue;
      params.push(value);
      clauses.push(`${key} = $${params.length}`);
    }

    const limit = Math.min(Number(queryParams.limit || 100), 500);
    params.push(limit);

    const result = await query(
      `SELECT * FROM ${config.table}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${parseSort(queryParams.sort)}
       LIMIT $${params.length}`,
      params
    );

    return result.rows;
  }

  async create(entityName, userId, data = {}) {
    const config = getEntityConfig(entityName);
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

    const result = await query(sql, [userId, ...values]);
    return result.rows[0];
  }

  async update(entityName, userId, id, data = {}) {
    const config = getEntityConfig(entityName);
    const columns = config.columns.filter((column) => data[column] !== undefined);
    const jsonColumns = new Set(config.jsonColumns || []);

    if (columns.length === 0) {
      const error = new Error('No valid fields to update.');
      error.status = 400;
      throw error;
    }

    const values = columns.map((column) => jsonColumns.has(column) ? JSON.stringify(data[column] ?? []) : data[column]);
    const setSql = columns.map((column, index) => `${column} = $${index + 3}${jsonColumns.has(column) ? '::jsonb' : ''}`).join(', ');
    const result = await query(
      `UPDATE ${config.table}
       SET ${setSql}, updated_date = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    if (!result.rows[0]) {
      const error = new Error('Record not found.');
      error.status = 404;
      throw error;
    }

    return result.rows[0];
  }

  async delete(entityName, userId, id) {
    const config = getEntityConfig(entityName);
    await query(`DELETE FROM ${config.table} WHERE id = $1 AND user_id = $2`, [id, userId]);
  }
}
