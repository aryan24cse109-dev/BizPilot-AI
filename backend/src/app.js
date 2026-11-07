
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import businessRoutes from "./modules/business/business.routes.js";
import connectionRoutes from "./modules/connections/connection.routes.js";
import invitationRoutes from "./modules/invitations/invitation.routes.js";

import invoiceRoutes from "./modules/invoices/invoice.routes.js";
import paymentRoutes, {
  dummyPaymentRouter,
  paymentWebhookRouter,
} from "./modules/payments/payment.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import assistantRoutes from "./modules/assistant/assistant.routes.js";
import messageRoutes from "./modules/messages/message.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Webhooks must receive the exact bytes signed by Razorpay.
app.use(
  `${env.API_PREFIX}/payments/webhooks`,
  express.raw({ type: "application/json", limit: "1mb" }),
  paymentWebhookRouter,
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


// Health check
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

// Phase 4 API routes
app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/users`, userRoutes);
app.use(`${env.API_PREFIX}/business`, businessRoutes);
app.use(`${env.API_PREFIX}/connections`, connectionRoutes);
app.use(`${env.API_PREFIX}/invitations`, invitationRoutes);
app.use(`${env.API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${env.API_PREFIX}/payments`, paymentRoutes);
app.use(`${env.API_PREFIX}/demo-payments`, dummyPaymentRouter);
app.use(`${env.API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${env.API_PREFIX}/assistant`, assistantRoutes);
app.use(`${env.API_PREFIX}/messages`, messageRoutes);
app.use(`${env.API_PREFIX}/notifications`, notificationRoutes);
// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
