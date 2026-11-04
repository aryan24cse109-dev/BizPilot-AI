import { z } from 'zod';

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than 0').default(1),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    clientId: z.string().uuid('Valid Client User ID is required'),
    dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid due date is required'),
    currency: z.string().default('INR'),
    items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
    taxRate: z.number().min(0).max(100).default(0),
    discountRate: z.number().min(0).max(100).default(0),
    notes: z.string().optional(),
    terms: z.string().optional(),
    isDraft: z.boolean().default(false),
  }),
});

export const updateInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID'),
  }),
  body: z.object({
    dueDate: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    discountRate: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
  }),
});

export const invoiceActionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID'),
  }),
  body: z.object({
    reason: z.string().optional(),
  }).optional(),
});
