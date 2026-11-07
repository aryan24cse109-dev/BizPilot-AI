
import { z } from 'zod';

import {
  WORKFLOW_ACTIONS,
  AI_RESPONSE_TYPES
} from '../utils/constants.js';

const workflowActionValues = Object.values(WORKFLOW_ACTIONS);
const responseTypeValues = Object.values(AI_RESPONSE_TYPES);

const numericValue = z.union([
  z.number().finite(),
  z.string().trim().min(1).regex(/^\d+(?:\.\d+)?$/)
]);

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: numericValue.refine((value) => Number(value) > 0),
  unitPrice: numericValue.refine((value) => Number(value) >= 0),
  taxRate: numericValue.refine((value) => Number(value) >= 0 && Number(value) <= 100).optional()
}).strict();

export const assistantRequestSchema = z.object({
  message: z.string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(4000, 'Message cannot exceed 4000 characters.'),

  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().trim().min(1).max(4000)
    })
  ).max(20).optional().default([]),

  context: z.record(z.string(), z.unknown())
    .optional()
    .default({})
});

const entitiesSchema = z.object({
  invoiceId: z.string().trim().min(1).max(100).nullable().optional(),
  invoiceNumber: z.string().trim().min(1).max(100).nullable().optional(),
  clientName: z.string().trim().min(1).max(150).nullable().optional(),
  clientEmail: z.string().email().nullable().optional(),
  status: z.string().trim().min(1).max(50).nullable().optional(),
  amount: z.number().nonnegative().nullable().optional(),
  items: z.array(invoiceItemSchema).min(1).max(100).nullable().optional(),
  lineItems: z.array(invoiceItemSchema).min(1).max(100).nullable().optional(),
  currency: z.string().trim().length(3).nullable().optional(),
  dueDate: z.string().trim().max(50).nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional()
}).passthrough();

const workflowSchema = z.object({
  action: z.enum(workflowActionValues),

  parameters: z.record(z.string(), z.unknown())
    .default({}),

  requiresConfirmation: z.boolean()
    .optional()
    .default(false)
}).passthrough();

export const assistantAIResponseSchema = z.object({
  type: z.enum(responseTypeValues)
    .default(AI_RESPONSE_TYPES.CONVERSATION),

  intent: z.string()
    .nullable()
    .optional()
    .default(null),

  confidence: z.number()
    .min(0)
    .max(1)
    .optional()
    .default(0.95),

  entities: entitiesSchema.default({}),

  workflow: workflowSchema
    .nullable()
    .optional()
    .default(null),

  clarificationQuestion: z.string()
    .trim()
    .max(1000)
    .nullable()
    .optional()
    .default(null),

  response: z.string()
    .trim()
    .min(1)
    .max(4000)
}).passthrough();

export const validateAssistantRequest = (input) =>
  assistantRequestSchema.safeParse(input);

export const validateAssistantAIResponse = (input) =>
  assistantAIResponseSchema.safeParse(input);
