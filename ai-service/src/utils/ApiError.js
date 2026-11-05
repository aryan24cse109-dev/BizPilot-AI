export class ApiError extends Error {
  constructor({
    statusCode = 500,
    message = 'Internal server error',
    code = 'INTERNAL_SERVER_ERROR',
    details = null,
    isOperational = true,
    cause
  } = {}) {
    super(message, { cause });

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace?.(this, ApiError);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== null && {
          details: this.details
        })
      }
    };
  }
}

export const createApiError = (
  statusCode,
  message,
  code,
  details = null
) => {
  return new ApiError({
    statusCode,
    message,
    code,
    details
  });
};