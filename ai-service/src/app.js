import express from 'express';
import helmet from 'helmet';

import healthRoutes from './modules/health/health.routes.js';

import { requestIdMiddleware } from './middleware/requestId.middleware.js';

import {
  errorMiddleware,
  notFoundMiddleware
} from './middleware/error.middleware.js';

import assistantRoutes from './modules/assistant/assistant.routes.js';
import voiceRoutes from './modules/voice/voice.routes.js';

export const createApp = ({ assistantRouter = assistantRoutes } = {}) => {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());

  app.use(requestIdMiddleware);

  app.use(
    express.json({
      limit: '1mb'
    })
  );

  app.use('/api/assistant', assistantRouter);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/health', healthRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export default createApp();