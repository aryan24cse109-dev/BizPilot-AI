# Security Boundaries

- The backend is the authority for identity, account category, permissions,
  tenant isolation, and workflow execution.
- The AI service is an untrusted interpretation boundary and never accesses
  PostgreSQL or Prisma.
- `INTERNAL_SERVICE_SECRET` is used only by the backend caller and
  `AI_SERVICE_SECRET` only by the AI-service receiver. Their values must match
  and must never reach the browser.
- The AI receiver uses constant-time secret comparison and fails closed when
  authentication is absent or invalid.
- All AI workflow actions are allowlisted and validated again by the backend.
- `SEND_INVOICE` and `CANCEL_INVOICE` require explicit confirmation on the
  backend regardless of model output.
- Ownerless legacy records are not assigned automatically and remain excluded
  from normal user access.
- Razorpay verification/webhooks, not AI output, determine payment state.
- Logs and responses must not contain secrets, cookies, JWTs, provider keys,
  authorization headers, or unnecessary client data.

Cookie-authenticated state-changing routes should receive an explicit CSRF
review before production deployment.
