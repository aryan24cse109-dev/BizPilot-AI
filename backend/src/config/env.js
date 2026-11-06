
import dotenv from "dotenv";
dotenv.config({ override: true });
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  API_PREFIX: z.string().startsWith("/").default("/api"),

  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://"),
      "Invalid PostgreSQL connection URL"
    ),

  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  AI_SERVICE_URL: z.string().url().default("http://localhost:6000"),

  INTERNAL_SERVICE_SECRET: z
    .string()
    .min(32, "INTERNAL_SERVICE_SECRET must contain at least 32 characters")
    .optional(),

  GOOGLE_CLIENT_ID: z.string().default(""),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),

  SESSION_COOKIE_NAME: z.string().default("bizpilot_session"),

  SESSION_DURATION_DAYS: z.coerce.number().int().min(1).max(30).default(7),

  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),

  EMAIL_API_KEY: z.string().default(""),

  EMAIL_FROM: z.string().default(""),

  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");

  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

if (result.data.NODE_ENV === "production" && !result.data.INTERNAL_SERVICE_SECRET) {
  console.error("Invalid environment configuration:");
  console.error("- INTERNAL_SERVICE_SECRET: required in production");
  process.exit(1);
}

export const env = Object.freeze(result.data);
