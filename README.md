# BizPilot AI — Intelligent Business Operations & Invoicing Platform

[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2018%20(Neon)-blue)](https://neon.tech)
[![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748)](https://prisma.io)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20Tailwind-38B2AC)](https://vitejs.dev)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini%20%2B%20Sarvam%20Saaras%20v4-10B981)](https://sarvam.ai)
[![Payment](https://img.shields.io/badge/Payments-Razorpay%20%2B%20PayPal%20Sandbox-F59E0B)](https://razorpay.com)

**BizPilot AI** is an AI-powered business invoicing, payment tracking, client collaboration, and financial intelligence platform designed for freelancers, startups, agencies, and small enterprises.

---

## 🚀 Key Features

1. **Multilingual AI Business Operator**:
   - Supports natural-language voice and text in **English, Hindi, and Hinglish** (e.g., *"Rahul ke liye 15000 rupees ka invoice banao for website development"*).
   - Powered by Sarvam Saaras v4 STT and Gemini/NLP intent parsing.
   - Interactive Draft Confirmation: Previews client details, line items, 18% GST calculation, and grand total, requesting user confirmation before committing to PostgreSQL.
2. **Authoritative Financial Invoicing Engine**:
   - Sequential, gapless numbering (`INV-YYYY-XXXX`) scoped per workspace.
   - Exact decimal monetary arithmetic (`decimal.js` cents/paise integer math) preventing IEEE-754 floating point errors.
   - Professional PDF invoice generation via PDFKit with embedded QR payment codes.
3. **Verified Fintech Payment Engine**:
   - Integrated with **Razorpay Sandbox** (UPI, Card, NetBanking) and **PayPal Sandbox**.
   - Cryptographic HMAC-SHA256 signature verification.
   - Strict idempotency protection against duplicate webhook deliveries and double-charging.
   - Real-time balance deduction and partial payment support.
4. **Multi-Tenant Workspace Security**:
   - Workspaces enforce total tenant isolation.
   - Dual-mode identity allowing users to seamlessly switch between **Business Owner** and **Client** perspectives.
5. **Real-time Business Intelligence**:
   - 100% database-backed monthly collection charts (Recharts).
   - Accounts receivable aging analysis (0-30, 31-60, 61-90, 90+ days).
   - Historical trend-based cashflow forecasting.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Charcoal & Emerald Fintech Theme), React Router 7, TanStack Query, Recharts, Lucide React, Axios.
- **Backend**: Node.js, Express.js (ES Modules), Prisma ORM, Neon PostgreSQL 18, Zod, JWT, bcryptjs, PDFKit, QRCode.
- **AI & Speech**: Sarvam Saaras v4 Speech-to-Text, Google Gemini API, Rule-based Multilingual NLP Engine.
- **Payments**: Razorpay Sandbox Adapter, PayPal Sandbox Adapter.

---

## 📦 Getting Started

### 1. Database Setup
A live Neon PostgreSQL 18 instance is already provisioned and configured:
```bash
cd backend
npx prisma db push
npm run prisma:seed # Pre-seeds verified demo accounts
```

### 2. Run Backend API
```bash
cd backend
npm run dev
# Server running at http://localhost:5000
```

### 3. Run Frontend
```bash
cd frontend
npm run dev
# Frontend running at http://localhost:5173
```

---

## 🔑 Demo Test Accounts

The database comes pre-seeded with verified test accounts:

| Role | Email | Password | Name / Entity |
|---|---|---|---|
| **Business Owner** | `business@bizpilot.ai` | `Password@123` | Rajesh Kumar (TechNova Solutions) |
| **Client** | `rahul@rahulenterprises.com` | `Password@123` | Rahul Sharma (Rahul Enterprises) |

---

## 🧪 Automated Integration Tests

All 4 test suites pass with full integration against the live database:
```bash
cd backend
npx vitest run
```
- `auth.test.js` (Registration, Login, Duplicate prevention)
- `invoice.test.js` (Sequential numbering, precision math, PDF generation, multi-tenant isolation)
- `payment.test.js` (Order creation, signature verification, idempotency, partial payments)
- `ai.test.js` (Hinglish/Hindi NLP parsing, interactive draft confirmation, verified DB queries)
