import { env } from "../config/env.js";

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number(error.statusCode || error.status) || 500;

  const message =
    statusCode >= 500 && env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message || "Something went wrong";

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
}