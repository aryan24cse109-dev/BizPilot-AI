import { ApiError } from '../utils/ApiError.js';
import {
  HTTP_STATUS,
  ERROR_CODES
} from '../utils/constants.js';

export const validate = (schema, property = 'body') => {
  const allowedProperties = ['body', 'query', 'params'];

  if (!allowedProperties.includes(property)) {
    throw new Error(`Unsupported validation property: ${property}`);
  }

  return (req, res, next) => {
    const result = schema.safeParse(req[property]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));

      return next(
        new ApiError({
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: 'Request validation failed.',
          code: ERROR_CODES.VALIDATION_ERROR,
          details
        })
      );
    }

    // Keep validated values separate from Express request properties.
    req.validated = req.validated ?? {};
    req.validated[property] = result.data;

    next();
  };
};