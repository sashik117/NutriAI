import { Router } from 'express';
import { requireAuth } from '../auth/authService.js';
import { prepareAiPayload } from '../services/aiTaskService.js';

export function createAiRouter({ aiService, nutritionService }) {
  const router = Router();
  router.use(requireAuth);

  router.post('/invoke', async (req, res, next) => {
    const payload = prepareAiPayload(req.body || {});

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

  return router;
}
