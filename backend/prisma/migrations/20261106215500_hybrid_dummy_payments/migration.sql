-- CreateEnum
CREATE TYPE "DummyPaymentSessionStatus" AS ENUM ('ACTIVE', 'SUCCESSFUL', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DummyPaymentEventType" AS ENUM ('SUCCESS_SIMULATED', 'FAILURE_SIMULATED');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'DUMMY';

-- CreateTable
CREATE TABLE "dummy_payment_sessions" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "businessUserId" UUID NOT NULL,
    "clientUserId" UUID,
    "tokenHash" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "DummyPaymentSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "dummy_payment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dummy_payment_events" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "paymentId" UUID,
    "eventType" "DummyPaymentEventType" NOT NULL,
    "requestKey" VARCHAR(150) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dummy_payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dummy_payment_sessions_tokenHash_key" ON "dummy_payment_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "dummy_payment_sessions_invoiceId_status_idx" ON "dummy_payment_sessions"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "dummy_payment_sessions_expiresAt_status_idx" ON "dummy_payment_sessions"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "dummy_payment_sessions_businessUserId_status_idx" ON "dummy_payment_sessions"("businessUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dummy_payment_events_requestKey_key" ON "dummy_payment_events"("requestKey");

-- CreateIndex
CREATE INDEX "dummy_payment_events_sessionId_createdAt_idx" ON "dummy_payment_events"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "dummy_payment_events_eventType_createdAt_idx" ON "dummy_payment_events"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "dummy_payment_sessions" ADD CONSTRAINT "dummy_payment_sessions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dummy_payment_sessions" ADD CONSTRAINT "dummy_payment_sessions_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dummy_payment_sessions" ADD CONSTRAINT "dummy_payment_sessions_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dummy_payment_events" ADD CONSTRAINT "dummy_payment_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "dummy_payment_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dummy_payment_events" ADD CONSTRAINT "dummy_payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_dummy_provider_ids_check"
CHECK (
  "provider" <> 'DUMMY'
  OR (
    "providerOrderId" IS NULL
    AND "providerPaymentId" IS NULL
    AND "providerPaymentLinkId" IS NULL
  )
);
