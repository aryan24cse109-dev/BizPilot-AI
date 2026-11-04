import app from './app.js';
import { ENV } from './config/env.js';
import prisma from './config/db.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    // Verify database connectivity
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database (Neon) successfully.');

    app.listen(ENV.PORT, () => {
      logger.info(`BizPilot AI Backend running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
      logger.info(`API Base URL: http://localhost:${ENV.PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
