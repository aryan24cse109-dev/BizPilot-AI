import { z } from 'zod';

export const aiChatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    conversationId: z.string().uuid().optional(),
    language: z.enum(['en', 'hi', 'hinglish']).default('en'),
  }),
});

export const aiExecuteSchema = z.object({
  body: z.object({
    actionLogId: z.string().uuid('Valid actionLogId is required'),
    confirmed: z.boolean(),
    overrides: z.record(z.any()).optional(),
  }),
});
