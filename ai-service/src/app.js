import express from 'express';
import helmet from 'helmet';

import healthRoutes from './modules/health/health.routes.js';

import { requestIdMiddleware } from './middleware/requestId.middleware.js';

import {
  errorMiddleware,
  notFoundMiddleware
} from './middleware/error.middleware.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(requestIdMiddleware);

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use('/api/health', healthRoutes);

// Other protected API routes will be mounted in later stages.

// Handle unknown routes.
app.use(notFoundMiddleware);

// Must be registered after routes and the 404 handler.
app.use(errorMiddleware);

export default app;