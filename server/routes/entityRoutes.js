import { Router } from 'express';
import { currentUser } from '../auth/authService.js';
import { EntityRepository } from '../repositories/entityRepository.js';
import { serialize } from '../utils/serialize.js';

export function createEntityRouter({ entityRepository = new EntityRepository() } = {}) {
  const router = Router();

  router.get('/:entityName', async (req, res, next) => {
    try {
      const user = await currentUser(req);
      const rows = await entityRepository.list(req.params.entityName, user.id, req.query);
      res.json(rows.map(serialize));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:entityName', async (req, res, next) => {
    try {
      const user = await currentUser(req);
      const row = await entityRepository.create(req.params.entityName, user.id, req.body || {});
      res.status(201).json(serialize(row));
    } catch (error) {
      next(error);
    }
  });

  router.put('/:entityName/:id', async (req, res, next) => {
    try {
      const user = await currentUser(req);
      const row = await entityRepository.update(req.params.entityName, user.id, req.params.id, req.body || {});
      res.json(serialize(row));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:entityName/:id', async (req, res, next) => {
    try {
      const user = await currentUser(req);
      await entityRepository.delete(req.params.entityName, user.id, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
