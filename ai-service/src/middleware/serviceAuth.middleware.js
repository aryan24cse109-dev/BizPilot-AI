import { timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants.js';

export const createServiceAuthMiddleware = (expectedSecret = env.AI_SERVICE_SECRET) =>
  (req, res, next) => {
  try {
    if (!expectedSecret) {
      throw new ApiError({
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Service authentication is not configured.',
        code: 'SERVICE_AUTH_NOT_CONFIGURED'
      });
    }

    const receivedSecret = req.get('x-ai-service-secret');

    if (!receivedSecret || typeof receivedSecret !== 'string') {
      throw new ApiError({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Service authentication required.',
        code: ERROR_CODES.UNAUTHORIZED
      });
    }

    const expectedBuffer = Buffer.from(expectedSecret, 'utf8');
    const receivedBuffer = Buffer.from(receivedSecret, 'utf8');

    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      throw new ApiError({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Invalid service credentials.',
        code: ERROR_CODES.UNAUTHORIZED
      });
    }

    req.serviceAuthenticated = true;

    next();
  } catch (error) {
    next(error);
  }
  };

export const serviceAuthMiddleware = createServiceAuthMiddleware();