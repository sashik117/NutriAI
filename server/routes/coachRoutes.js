import { Router } from 'express';
import { requireAuth } from '../auth/authService.js';
import { CoachService } from '../services/coachService.js';

export function createCoachRouter({ coachService = new CoachService() } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get('/profile', async (req, res, next) => {
    try {
      res.json({ profile: await coachService.getProfile(req.user) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/profile', async (req, res, next) => {
    try {
      res.status(201).json(await coachService.upsertProfile(req.user, req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  router.get('/invites', async (req, res, next) => {
    try {
      res.json(await coachService.listInvites(req.user));
    } catch (error) {
      next(error);
    }
  });

  router.post('/invites', async (req, res, next) => {
    try {
      res.status(201).json(await coachService.createInvite(req.user, req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/invites/:inviteId', async (req, res, next) => {
    try {
      res.json(await coachService.revokeInvite(req.user, req.params.inviteId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/connect', async (req, res, next) => {
    try {
      res.status(201).json(await coachService.connectWithInvite(req.user, req.body?.code));
    } catch (error) {
      next(error);
    }
  });

  router.get('/my-coaches', async (req, res, next) => {
    try {
      res.json(await coachService.listMyCoaches(req.user));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/my-coaches/:relationshipId/permissions', async (req, res, next) => {
    try {
      res.json(await coachService.updateMyCoachPermissions(req.user, req.params.relationshipId, req.body?.permissions || {}));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/my-coaches/:relationshipId', async (req, res, next) => {
    try {
      res.json(await coachService.disconnectMyCoach(req.user, req.params.relationshipId));
    } catch (error) {
      next(error);
    }
  });

  router.get('/clients', async (req, res, next) => {
    try {
      res.json(await coachService.listClients(req.user, req.query?.date));
    } catch (error) {
      next(error);
    }
  });

  router.get('/clients/:clientId', async (req, res, next) => {
    try {
      res.json(await coachService.getClientDetail(req.user, req.params.clientId, req.query?.date));
    } catch (error) {
      next(error);
    }
  });

  router.post('/clients/:clientId/notes', async (req, res, next) => {
    try {
      res.status(201).json(await coachService.addNote(req.user, req.params.clientId, req.body?.note));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/notes/:noteId', async (req, res, next) => {
    try {
      res.json(await coachService.deleteNote(req.user, req.params.noteId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
