import { Router } from 'express';

export function createAiRouter({ aiService, nutritionService }) {
  const router = Router();

  router.post('/invoke', async (req, res, next) => {
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

  return router;
}
