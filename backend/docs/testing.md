# Testing

## Deterministic service tests

```powershell
cd ai-service
npm test
npm run check

cd ..\backend
npm test
```

AI providers are mocked by the tests. Ordinary test runs do not require live
Sarvam or Groq calls.

## Covered boundaries

- AI-service health and readiness endpoints
- Service-secret authentication and missing credentials
- Backend AI-client headers, timeout, malformed JSON, and sanitized failures
- AI response allowlists and action-specific parameters
- Clarification and confirmation behavior
- Existing backend workflow execution boundary
- Provider fallback and provider failure behavior
- Cross-service HTTP contract using an injected deterministic AI handler
- Existing authentication, invoice, payment, dashboard, and workflow tests

## Local E2E boundary

The repository currently has no frontend implementation beyond `frontend/.gitkeep`.
The backend HTTP API is therefore the E2E entry point. A full browser E2E test
remains unverified until a frontend client exists.

For local service smoke testing, configure a dedicated PostgreSQL database for
the backend and use the same service secret in both service environment files.
Do not run destructive tests against a normal development database.
