import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid('Valid invoice ID is required'),
    provider: z.enum(['RAZORPAY', 'PAYPAL', 'MANUAL']),
    amount: z.number().positive('Payment amount must be greater than 0').optional(), // If not provided, full balance due
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid(),
    provider: z.enum(['RAZORPAY', 'PAYPAL', 'MANUAL']),
    providerOrderId: z.string().min(1),
    providerPaymentId: z.string().min(1),
    signature: z.string().optional(),
    amount: z.number().positive(),
    currency: z.string().default('INR'),
    paymentMethod: z.string().optional(),
  }),
});
