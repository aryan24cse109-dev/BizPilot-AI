import { z } from "zod";

export const workflowSchema = z.object({
  operation: z.enum([
    "GET_INVOICE",
    "GET_INVOICE_STATUS",
    "GET_PAYMENT_HISTORY",
    "GET_OUTSTANDING_BALANCE",
    "GET_DASHBOARD_SUMMARY",
    "GET_PAYMENT_SUMMARY",
    "GET_CLIENT_PAYMENT_SUMMARY",
    "LIST_INVOICES",
    "LIST_PENDING_INVOICES",
    "LIST_OVERDUE_INVOICES",
    "LIST_DRAFT_INVOICES",
    "LIST_PAID_INVOICES",
    "LIST_PARTIALLY_PAID_INVOICES",
    "GET_CLIENT_INVOICES",
    "CREATE_INVOICE_DRAFT",
    "PREPARE_PAYMENT_FOLLOWUP",
    "PREPARE_CLIENT_MESSAGE",
    "SEND_INVOICE",
    "CANCEL_INVOICE",
  ]),
  input: z.record(z.string(), z.unknown()).default({}),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().trim().min(8).max(150).optional(),
});

export const assistantMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(4000),
    }).strict(),
  ).max(10).default([]),
  confirmed: z.boolean().default(false),
}).strict();
