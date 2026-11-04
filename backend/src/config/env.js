import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'bizpilot_super_secure_jwt_secret_production_2026_xyz',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // AI
  AI_PROVIDER: process.env.AI_PROVIDER || 'auto',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  SARVAM_API_KEY: process.env.SARVAM_API_KEY || '',

  // Payments
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_bizpilot_demo_key',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_bizpilot_demo_secret',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_bizpilot',

  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || 'paypal_test_bizpilot_demo_client_id',
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || 'paypal_test_bizpilot_demo_secret',
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID || 'paypal_test_webhook_id',
};
