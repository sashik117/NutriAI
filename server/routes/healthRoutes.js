import { Router } from 'express';
import { query } from '../db.js';

export function createHealthRouter() {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
