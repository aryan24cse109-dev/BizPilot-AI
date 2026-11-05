import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const emptyToUndefined = (value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
};

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional()
);

const optionalSecret = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional()
);

const timeoutFromSupportedNames = z.preprocess(
  (value) => value ?? process.env.AI_REQUEST_TIMEOUT,
  z.coerce
    .number()
    .int()
    .min(1000)
    .max(120000)
    .default(30000)
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5001),

  BACKEND_SERVICE_URL: z
    .string()
    .url()
    .default('http://localhost:5000'),

  AI_PRIMARY_PROVIDER: z
    .enum(['sarvam', 'groq'])
    .default('sarvam'),

  AI_FALLBACK_PROVIDER: z
    .enum(['sarvam', 'groq'])
    .default('groq'),

  SARVAM_API_KEY: optionalSecret,

  SARVAM_MODEL: optionalString,

  GROQ_API_KEY: optionalSecret,

  GROQ_MODEL: optionalString,

  AI_SERVICE_SECRET: optionalSecret,

  AI_REQUEST_TIMEOUT_MS: timeoutFromSupportedNames,

  AI_MAX_RETRIES: z.coerce
    .number()
    .int()
    .min(0)
    .max(5)
    .default(1)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message
  }));

  console.error(
    '[AI SERVICE] Invalid environment configuration:',
    JSON.stringify(errors, null, 2)
  );

  throw new Error('Invalid AI service environment configuration.');
}

const validatedEnv = parsedEnv.data;

if (
  validatedEnv.AI_PRIMARY_PROVIDER ===
  validatedEnv.AI_FALLBACK_PROVIDER
) {
  throw new Error(
    'AI_PRIMARY_PROVIDER and AI_FALLBACK_PROVIDER must be different.'
  );
}

if (
  validatedEnv.AI_SERVICE_SECRET &&
  validatedEnv.AI_SERVICE_SECRET.length < 32
) {
  throw new Error(
    'AI_SERVICE_SECRET must contain at least 32 characters.'
  );
}

if (
  validatedEnv.NODE_ENV === 'production' &&
  !validatedEnv.AI_SERVICE_SECRET
) {
  throw new Error(
    'AI_SERVICE_SECRET is required in production.'
  );
}

export const env = Object.freeze(validatedEnv);