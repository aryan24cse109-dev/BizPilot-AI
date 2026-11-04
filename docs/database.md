# BizPilot AI — Database Architecture & Schema Specification

## 1. Overview
The database layer is powered by PostgreSQL 18 provisioned on Neon Serverless PostgreSQL and orchestrated via Prisma ORM. All financial data is modeled with normalized relational structures, foreign key constraints, composite unique indexes, and high-precision `Decimal(12, 2)` monetary representations.

---

## 2. Entity Relational Model (23 Core Entities)

| Entity Name | Primary Key | Description |
|---|---|---|
| `User` | UUID | Base authentication record with unique email and username. |
| `UserProfile` | UUID | User preferences including theme, language (`en`, `hi`, `hinglish`), and phone. |
| `BusinessWorkspace` | UUID | Isolated multi-tenant business context with custom currency and slug. |
| `WorkspaceMember` | UUID | RBAC membership mapping users to workspaces (`OWNER`, `ADMIN`, `FINANCE_MANAGER`, `MEMBER`). |
| `BusinessProfile` | UUID | Official business entity details, legal GSTIN/Tax ID, address, and invoice payment instructions. |
| `Connection` | UUID | Privacy-preserving relationship linking businesses with clients (`PENDING`, `ACCEPTED`, `REJECTED`). |
| `Invoice` | UUID | Core billing entity with sequenced number, issue date, due date, subtotal, tax, discount, balance. |
| `InvoiceItem` | UUID | Line item detailing service description, decimal quantity, unit price, and total. |
| `InvoiceEvent` | UUID | Immutable audit trail of invoice lifecycle events (`CREATED`, `SENT`, `VIEWED`, `PAID`, `CANCELLED`). |
| `InvoiceSequence` | UUID | Gapless sequential counter per workspace per calendar year. |
| `PaymentAccount` | UUID | Connected gateway merchant configuration for Razorpay and PayPal. |
| `Payment` | UUID | Authoritative record of completed/settled payment transaction with provider reference. |
| `PaymentAttempt` | UUID | Pre-settlement gateway order tracking to link orders with webhook completions. |
| `WebhookEvent` | UUID | Idempotent registry of incoming payment callbacks. |
| `Refund` | UUID | Refund transactions mapped to original payments. |
| `Conversation` | UUID | 1-to-1 secure message container between connected users. |
| `Message` | UUID | Individual chat message or system activity card. |
| `Notification` | UUID | In-app alerts for invoice deliveries, views, payments, and connection requests. |
| `ReminderSchedule` | UUID | Automated or manual payment reminder schedules. |
| `AIConversation` | UUID | Persistent history of user interactions with the AI assistant. |
| `AIMessage` | UUID | Chat turn with recorded intent, tool parameters, and tool execution results. |
| `AIActionLog` | UUID | Audit trail of AI-prepared action drafts requiring explicit user confirmation. |
| `AuditLog` | UUID | System-wide immutable security and administrative audit log. |

---

## 3. Monetary Precision & Indexing Strategy
- Monetary columns (`subtotal`, `taxAmount`, `discountAmount`, `totalAmount`, `paidAmount`, `balanceDue`, `amount`) are stored using `@db.Decimal(12, 2)`.
- Unique Constraints:
  - `@@unique([workspaceId, invoiceNumber])`: Guarantees unique invoice numbers within each workspace tenant.
  - `@@unique([workspaceId, year, prefix])`: Ensures concurrent-safe numbering counters.
  - `@@unique([providerPaymentId])`: Strictly prevents duplicate credit or double charging.
  - `@@unique([senderId, receiverId])`: Prevents duplicate connection links.
