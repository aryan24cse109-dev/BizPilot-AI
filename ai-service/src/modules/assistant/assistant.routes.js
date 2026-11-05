
import { Router } from 'express';
import { interpretAssistantMessage } from './assistant.controller.js';
import { serviceAuthMiddleware } from '../../middleware/serviceAuth.middleware.js';
import { aiRateLimiter } from '../../middleware/rateLimit.middleware.js';

export const createAssistantRoutes = ({
  serviceAuth = serviceAuthMiddleware,
  rateLimiter = aiRateLimiter,
  controller = interpretAssistantMessage,
} = {}) => {
  const router = Router();

  router.post('/interpret', serviceAuth, rateLimiter, controller);

  return router;
};

export default createAssistantRoutes();
