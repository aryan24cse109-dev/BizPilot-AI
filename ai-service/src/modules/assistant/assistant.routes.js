
import { Router } from 'express';
import { interpretAssistantMessage } from './assistant.controller.js';
import { serviceAuthMiddleware } from '../../middleware/serviceAuth.middleware.js';
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware.js';

const router = Router();

router.post(
  '/interpret',
  serviceAuthMiddleware,
  rateLimitMiddleware,
  interpretAssistantMessage
);

export default router;
