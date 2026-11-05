import app from './app.js';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info('AI service started successfully', {
    port: env.PORT,
    environment: env.NODE_ENV
  });
});

const shutdown = (signal) => {
  logger.info('Shutdown signal received', {
    signal
  });

  server.close((error) => {
    if (error) {
      logger.error('Error during server shutdown', {
        message: error.message
      });

      process.exitCode = 1;
      return;
    }

    logger.info('AI service stopped successfully');

    process.exitCode = 0;
  });

  // Prevent indefinite waiting for active connections.
  setTimeout(() => {
    logger.error('Graceful shutdown timed out');

    server.closeAllConnections();

    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('SIGINT', () => shutdown('SIGINT'));

server.on('error', (error) => {
  logger.error('HTTP server error', {
    message: error.message,
    code: error.code
  });

  process.exitCode = 1;
});