
# BizPilot AI — Database Documentation

## Database

- PostgreSQL
- Prisma ORM 7
- Prisma PostgreSQL adapter
- Database name: bizpilot_ai

## Schema source

The only Prisma schema is:

`backend/prisma/schema.prisma`

Prisma migrations are stored in:

`backend/prisma/migrations/`

Do not create a second Prisma schema in this folder.

## Main tables

| Table | Purpose |
|---|---|
| users | Business and client accounts |
| business_profiles | Business account details |
| client_profiles | Client details |
| connections | Business-client relationships |
| invitations | Secure client invitations |
| invoices | Invoice records |
| invoice_items | Individual invoice items |
| payments | Razorpay payment records |
| payment_webhook_events | Payment webhook processing |
| notifications | User notifications |
| audit_logs | Activity and ownership audit trail |

## Ownership rules

1. Business-owned resources must be scoped to their business account.
2. A client can access only resources explicitly shared with or assigned to them.
3. A pending connection does not grant access.
4. An invitation is not a user account.
5. Ownerless legacy records must never be assigned to an arbitrary user.
6. Normal application queries must not expose ownerless records.
7. New records must have an authenticated and authorized owner.

## Payment rules

- Razorpay Test Mode is used during development.
- Verify webhook signatures before processing payment events.
- Store provider event IDs to prevent duplicate processing.
- Never mark an invoice paid based only on a frontend redirect.
- Verify payment amount, currency, invoice and provider identifiers.

## Important development rule

Never use `prisma migrate reset` on a database containing data that must be preserved.
