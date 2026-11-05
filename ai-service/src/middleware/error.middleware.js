import { ZodError } from 'zod';

import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import {
  HTTP_STATUS,
  ERROR_CODES
} from '../utils/constants.js';

export const notFoundMiddleware = (req, res, next) => {
  next(
    new ApiError({
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: ERROR_CODES.NOT_FOUND
    })
  );
};

export const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

  let code = ERROR_CODES.INTERNAL_SERVER_ERROR;

  let message = 'Internal server error.';

  let details = null;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Request validation failed.';

    details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Invalid JSON request body.';
  } else if (error?.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload is too large.';
  }

 logger.error('Request failed', {
  requestId: req.requestId ?? null,
  method: req.method,
  path: req.path,
  statusCode,
  code,
  errorName: error.name
});

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== null ? { details } : {})
    },
    requestId: req.requestId ?? null
  });
};