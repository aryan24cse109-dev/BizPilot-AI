import { rateLimit } from 'express-rate-limit';

import { HTTP_STATUS, ERROR_CODES } from '../utils/constants.js';

export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 60,

  standardHeaders: 'draft-8',

  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests. Please try again later.'
    }
  },

  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests. Please try again later.'
      },
      requestId: req.requestId ?? null
    });
  }
});