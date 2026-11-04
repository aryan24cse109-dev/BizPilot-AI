# Backend stages 6-8

## Payment API

Authenticated client endpoints:

- `POST /api/payments/invoices/:invoiceId/order`
  - Body: `{ "amount": "100.00", "idempotencyKey": "client-generated-unique-key" }`
  - Amount is optional and defaults to the current invoice balance.
- `POST /api/payments/verify`
  - Body: `{ "razorpayOrderId", "razorpayPaymentId", "razorpaySignature" }`
  - A valid Checkout signature records the provider payment and leaves it pending until authoritative capture reconciliation.
- `GET /api/payments`
- `GET /api/payments/:id`
- `GET /api/payments/invoices/:invoiceId`

The webhook endpoint is unauthenticated and signature protected:

- `POST /api/payments/webhooks/razorpay`

It must be configured in Razorpay with the same `RAZORPAY_WEBHOOK_SECRET`. The raw request body is verified before JSON parsing. The implementation handles `payment.captured` and `payment.failed`; payment links and QR codes are not fabricated because account eligibility cannot be inferred locally.

## Dashboard API

- `GET /api/dashboard`
- `GET /api/dashboard/invoices`
- `GET /api/dashboard/transactions`

All dashboard queries use the authenticated user. Invoice metrics use issue dates; captured collection metrics use capture dates. Amounts are returned as Decimal-compatible values. Draft and cancelled invoices are excluded from published financial totals.

## Workflow API

- `POST /api/assistant/workflows/execute`

Supported operations are `GET_INVOICE`, `GET_INVOICE_STATUS`, `GET_PAYMENT_HISTORY`, `GET_OUTSTANDING_BALANCE`, `GET_DASHBOARD_SUMMARY`, `CREATE_INVOICE_DRAFT`, `PREPARE_PAYMENT_FOLLOWUP`, `PREPARE_CLIENT_MESSAGE`, `SEND_INVOICE`, and `CANCEL_INVOICE`.

The operation is allowlisted and input is validated with Zod. Sending and cancelling require `"confirmed": true`; otherwise the endpoint returns a confirmation-required response. The workflow layer never calls the AI service or directly changes payment status.

## Development fixture

The fixture creates a clearly labelled, random business/client pair, active connection, and `SENT` invoice. It is never available through an API route:

```powershell
$env:NODE_ENV="development"
$env:PAYMENT_FIXTURE="1"
node scripts/create-payment-fixture.js
```

Use Razorpay Test Mode credentials only. Do not run this command in production.
