import { z } from "zod";

export const workflowSchema = z.object({
  operation: z.enum([
    "GET_INVOICE",
    "GET_INVOICE_STATUS",
    "GET_PAYMENT_HISTORY",
    "GET_OUTSTANDING_BALANCE",
    "GET_DASHBOARD_SUMMARY",
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
