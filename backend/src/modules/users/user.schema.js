
import { z } from "zod";

const optionalText = (max) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const onboardingSchema = z.discriminatedUnion("accountCategory", [
  z.object({
    accountCategory: z.literal("BUSINESS"),
    businessType: z.enum([
      "SMALL_BUSINESS",
      "FREELANCER",
      "STARTUP",
    ]),
    businessName: z.string().trim().min(2).max(200),
    legalName: optionalText(200),
    description: optionalText(2000),
    businessEmail: z.string().email().optional().or(z.literal("")),
    phone: optionalText(30),
    website: z.string().url().optional().or(z.literal("")),
    gstin: optionalText(20),
    country: z.string().trim().min(2).max(100).default("India"),
    currency: z.string().trim().length(3).default("INR"),
    addressLine1: optionalText(255),
    addressLine2: optionalText(255),
    city: optionalText(100),
    state: optionalText(100),
    postalCode: optionalText(20),
  }),

  z.object({
    accountCategory: z.literal("CLIENT"),
    phone: optionalText(30),
    billingAddress: optionalText(2000),
    city: optionalText(100),
    state: optionalText(100),
    postalCode: optionalText(20),
    country: z.string().trim().min(2).max(100).default("India"),
  }),
]);
