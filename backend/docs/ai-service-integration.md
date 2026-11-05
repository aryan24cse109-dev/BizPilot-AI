# Backend and AI Service Integration

## Trust boundary

The browser authenticates only with the backend using the existing HTTP-only
session cookie. The backend derives the user, account category, permissions,
and tenant scope from that session and its database. It then calls the AI
service with `x-ai-service-secret`.

The AI service calls Sarvam first and Groq for eligible provider failures. It
returns a proposal only. The backend validates the proposal again, checks
ownership, and invokes the existing workflow services. The AI service never
accesses Prisma, PostgreSQL, Razorpay, or email.

## Local startup

From separate terminals:

```powershell
cd ai-service
npm install
npm run dev

cd backend
npm install
npm run dev
```

Set the same high-entropy value in `backend/.env` as
`INTERNAL_SERVICE_SECRET` and in `ai-service/.env` as
`AI_SERVICE_SECRET`. Do not put either value in source code, Git-tracked
documentation, logs, or browser code.

## Endpoints

### Backend public assistant endpoint

`POST /api/assistant/message` requires the existing authenticated session
cookie:

```json
{
  "message": "Show the status of invoice inv-123",
  "conversationHistory": [],
  "confirmed": false
}
```

The backend returns one of:

- `status: "clarification_required"` when required information is missing.
- `status: "confirmation_required"` for `SEND_INVOICE` and `CANCEL_INVOICE`.
- `status: "executed"` after backend validation and execution.
- `status: "conversation"` for non-workflow responses.

### Internal AI endpoint

`POST /api/assistant/interpret` is service-authenticated and is not a
browser-facing endpoint:

```json
{
  "message": "Show my overdue invoices",
  "conversationHistory": [],
  "context": {
    "locale": "en-IN",
    "accountCategory": "BUSINESS",
    "capabilities": ["read_invoices"]
  }
}
```

The secret header is added by the backend client. Browser cookies, JWTs,
Google tokens, provider keys, and unrestricted database records are not
forwarded.

## Supported actions

The backend allowlist is:

`GET_INVOICE`, `GET_INVOICE_STATUS`, `GET_PAYMENT_HISTORY`,
`GET_OUTSTANDING_BALANCE`, `GET_DASHBOARD_SUMMARY`, `CREATE_INVOICE_DRAFT`,
`PREPARE_PAYMENT_FOLLOWUP`, `PREPARE_CLIENT_MESSAGE`, `SEND_INVOICE`, and
`CANCEL_INVOICE`.

`SEND_INVOICE` and `CANCEL_INVOICE` always require explicit backend
confirmation. An AI-generated confirmation flag is never treated as user
consent. Payment status remains authoritative to verified Razorpay evidence
and webhooks.

## Errors

The backend maps integration failures to safe public messages, including
`AI_SERVICE_UNAVAILABLE`, `AI_SERVICE_TIMEOUT`, `AI_SERVICE_AUTH_FAILED`,
`AI_RESPONSE_INVALID`, and `AI_SERVICE_REQUEST_FAILED`. Provider credentials,
service secrets, upstream headers, and stack traces are not returned.

Ownerless legacy records remain inaccessible to ordinary users. AI-generated
names, emails, IDs, roles, and payment statuses are never authorization
sources.
