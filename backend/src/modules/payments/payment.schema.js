import { z } from "zod";

export const createOrderSchema = z.object({
  amount: z.union([z.string().trim().min(1), z.number().finite()]).optional(),
  idempotencyKey: z.string().trim().min(8).max(150),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(1).max(100),
  razorpayPaymentId: z.string().trim().min(1).max(100),
  razorpaySignature: z.string().trim().min(1).max(256),
});

export const paymentListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    "INITIATED",
    "PENDING",
    "SUCCEEDED",
    "FAILED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ]).optional(),
});