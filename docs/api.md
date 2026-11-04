# BizPilot AI — REST API Documentation (v1)

Base URL: `/api/v1`

All protected endpoints require either:
- Header: `Authorization: Bearer <jwt_token>`
- Cookie: `token=<jwt_token>`
- Workspace-scoped endpoints accept: `x-workspace-id: <workspace_uuid>`

---

## 1. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Creates a user account, profile, and default business workspace.
- **Body**: `{ "name": "Rajesh Kumar", "email": "rajesh@tech.io", "username": "rajesh_tech", "password": "Password@123", "workspaceName": "TechNova", "businessType": "Agency" }`
- **Response**: `{ "success": true, "data": { "user": { ... }, "token": "..." } }`

### `POST /api/v1/auth/login`
- **Body**: `{ "emailOrUsername": "rajesh@tech.io", "password": "Password@123" }`
- **Response**: `{ "success": true, "data": { "user": { ... }, "token": "..." } }`

### `POST /api/v1/auth/logout`
Clears HTTP-only session cookie.

### `GET /api/v1/auth/me`
Retrieves authenticated user identity and workspace memberships.

---

## 2. Invoices (`/api/v1/invoices`)

### `POST /api/v1/invoices`
Creates a sequenced invoice.
- **Headers**: `x-workspace-id: <uuid>`
- **Body**:
  ```json
  {
    "clientId": "uuid",
    "dueDate": "2026-11-20T00:00:00.000Z",
    "currency": "INR",
    "items": [
      { "description": "Website Design", "quantity": 1, "unitPrice": 15000 }
    ],
    "taxRate": 18,
    "discountRate": 0,
    "notes": "Payment due upon milestone delivery",
    "isDraft": false
  }
  ```

### `GET /api/v1/invoices`
Lists workspace invoices with query filtering (`?status=PAID&search=INV-2026`).

### `GET /api/v1/invoices/client-received`
Lists invoices received by current authenticated client user.

### `GET /api/v1/invoices/:id`
Retrieves complete invoice record, line items, and audit event history.

### `GET /api/v1/invoices/:id/pdf`
Streams professional binary PDFKit invoice file with embedded QR payment code.

---

## 3. Payments & Gateways (`/api/v1/payments`)

### `POST /api/v1/payments/create-order`
Creates a payment order with selected provider (`RAZORPAY` or `PAYPAL`).
- **Body**: `{ "invoiceId": "uuid", "provider": "RAZORPAY", "amount": 15000 }`

### `POST /api/v1/payments/verify`
Authoritatively verifies payment signature and executes transactional balance ledger update.
- **Body**:
  ```json
  {
    "invoiceId": "uuid",
    "provider": "RAZORPAY",
    "providerOrderId": "order_xxx",
    "providerPaymentId": "pay_xxx",
    "signature": "hmac_sha256_signature",
    "amount": 15000,
    "currency": "INR",
    "paymentMethod": "UPI"
  }
  ```

### `POST /api/v1/webhooks/razorpay`
Idempotent Razorpay webhook listener verifying `x-razorpay-signature`.

---

## 4. AI Business Assistant (`/api/v1/ai`)

### `POST /api/v1/ai/chat`
Conversational natural-language query processing.
- **Body**:
  ```json
  {
    "message": "Rahul ke liye 15000 rupees ka invoice banao for website development",
    "language": "hinglish"
  }
  ```
- **Response**: Returns detected intent, draft preview, and `actionLogId` requiring user confirmation.

### `POST /api/v1/ai/execute`
User confirms or discards the prepared action draft.
- **Body**: `{ "actionLogId": "uuid", "confirmed": true }`

### `POST /api/v1/ai/voice/transcribe`
Transcribes audio base64 payload via Sarvam Saaras v4 STT.
