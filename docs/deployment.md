# BizPilot AI — Production Deployment Guide

## 1. Cloud Infrastructure Overview
- **Frontend SPA**: Deployable to Vercel, Cloudflare Pages, or Netlify.
- **Backend API**: Deployable to Render, Railway, AWS ECS, or DigitalOcean App Platform.
- **Database**: Serverless PostgreSQL 18 on Neon.

---

## 2. Environment Variables Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-bizpilot-frontend.vercel.app
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-twilight-paper-beij27o3-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="production_random_secret_string_minimum_32_characters"
JWT_EXPIRES_IN="7d"

AI_PROVIDER="auto" # gemini, sarvam, or auto
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.0-flash"
SARVAM_API_KEY="sarvam_api_key..."

RAZORPAY_KEY_ID="rzp_live_xxx" # or rzp_test_xxx
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_secret"
PAYPAL_WEBHOOK_ID="your_webhook_id"
```

---

## 3. Database Migration & Provisioning
Run migrations against the live database:
```bash
cd backend
npx prisma db push
# or npx prisma migrate deploy
npm run prisma:seed # seeds initial verified test accounts
```

---

## 4. Starting the Application

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run preview # or deploy dist/ to hosting
```
