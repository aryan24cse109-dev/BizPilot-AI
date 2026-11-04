import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must have at least 2 characters'),
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    workspaceName: z.string().optional(),
    businessType: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    emailOrUsername: z.string().min(1, 'Email or username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    preferredLang: z.enum(['en', 'hi', 'hinglish']).optional(),
    theme: z.enum(['light', 'dark']).optional(),
    businessName: z.string().optional(),
    businessType: z.string().optional(),
    addressLine1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    taxId: z.string().optional(),
    paymentInstructions: z.string().optional(),
  }),
});
