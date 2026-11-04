# BizPilot AI — Security & Compliance Architecture

## 1. Authentication & Session Management
- **Password Protection**: Passwords are salted and hashed using bcrypt with 10 salt rounds.
- **Session Tokens**: Cryptographically signed JSON Web Tokens (JWT) signed with secret key. Tokens are delivered in both the `Authorization: Bearer` header and secure HTTP-Only, SameSite cookies.
- **Credential Sanitization**: Passwords and secret keys are stripped before returning user objects to clients.

---

## 2. Multi-Tenant Workspace Isolation
- **Strict Scoping**: Every business query (`findMany`, `create`, `update`, `aggregate`) filters by `workspaceId`.
- **RBAC Validation**: Middleware verifies that the authenticated user either owns the workspace or possesses an active membership role in `WorkspaceMember`.
- **Client Privilege Boundary**: Clients can only inspect invoices where their `userId` matches `Invoice.clientId`. Cross-client or cross-workspace data leakage is strictly blocked.

---

## 3. Financial Integrity & Fraud Prevention
- **No Client-Side Authorization of Payments**: The application never trusts payment confirmations from frontend redirects, button clicks, or screenshots.
- **Cryptographic Signature Validation**: All Razorpay transactions verify HMAC-SHA256 signatures (`order_id + "|" + payment_id` against key secret).
- **Idempotency & Double-Spending Protection**: The `Payment` table enforces a unique constraint on `providerPaymentId`. Duplicate webhook deliveries or repeated verification calls are detected and ignored without altering ledger balances.
- **Fixed-Point Decimal Arithmetic**: Calculations avoid floating-point math to prevent rounding exploitation.

---

## 4. Privacy-Preserving Client Discovery
- Public client searches (`/api/v1/clients/search`) only return usernames, full names, and business entities. Private email addresses and billing histories are never exposed in search results.
