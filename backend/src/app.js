import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.js";

const app = express();

// Basic application settings
app.disable("x-powered-by");

// Security middleware
app.use(helmet());

// Frontend connection
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Basic backend health check
app.get(`${env.API_PREFIX}/health`, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "BizPilot AI backend is running",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

// Database readiness check
app.get(`${env.API_PREFIX}/health/ready`, async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "Backend and database are ready",
      data: {
        backend: "connected",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    return res.status(503).json({
      success: false,
      message: "Database is currently unavailable",
      data: {
        backend: "running",
        database: "disconnected",
      },
    });
  }
});

// Handle unknown routes
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;