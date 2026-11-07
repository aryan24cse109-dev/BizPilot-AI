-- Add missing NotificationType enum values.
-- Preserve all existing PostgreSQL enum values.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INVOICE_SENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INVOICE_PAID';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INVOICE_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SYSTEM_ALERT';

-- Add missing business profile fields.

ALTER TABLE "business_profiles"
ADD COLUMN "bankAccountName" VARCHAR(150),
ADD COLUMN "bankAccountNumber" VARCHAR(50),
ADD COLUMN "bankIfscCode" VARCHAR(20),
ADD COLUMN "bankName" VARCHAR(100),
ADD COLUMN "paymentInstructions" TEXT,
ADD COLUMN "upiId" VARCHAR(100);

-- Add missing invitation fields.

ALTER TABLE "invitations"
ADD COLUMN "clientName" VARCHAR(150),
ADD COLUMN "company" VARCHAR(200);