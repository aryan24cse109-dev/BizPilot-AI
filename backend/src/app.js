import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { ENV } from './config/env.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id', 'x-razorpay-signature'],
}));

// Body parsers with raw body preservation for webhooks
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logger in dev
if (ENV.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.path}`);
    next();
  });
}

// Mount REST API
app.use('/api/v1', apiRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
