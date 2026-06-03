import { Router } from 'express';
import { requireAuth } from '../auth/authService.js';
import { EntityRepository } from '../repositories/entityRepository.js';
import { serialize } from '../utils/serialize.js';

export function createEntityRouter({ entityRepository = new EntityRepository() } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get('/:entityName', async (req, res, next) => {
    try {
      const rows = await entityRepository.list(req.params.entityName, req.user.id, req.query);
      res.json(rows.map(serialize));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:entityName', async (req, res, next) => {
    try {
      const row = await entityRepository.create(req.params.entityName, req.user.id, req.body || {});
      res.status(201).json(serialize(row));
    } catch (error) {
      next(error);
    }
  });

  router.put('/:entityName/:id', async (req, res, next) => {
    try {
      const row = await entityRepository.update(req.params.entityName, req.user.id, req.params.id, req.body || {});
      res.json(serialize(row));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:entityName/:id', async (req, res, next) => {
    try {
      await entityRepository.delete(req.params.entityName, req.user.id, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
