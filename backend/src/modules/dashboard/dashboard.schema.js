import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const dashboardQuerySchema = z.object({
  period: z.enum(["current_month", "previous_month", "current_year"]).optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["INITIATED", "PENDING", "SUCCEEDED", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"]).optional(),
  includeCancelled: z.coerce.boolean().default(false),
}).superRefine((value, context) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "endDate must not precede startDate." });
  }
  if (value.period && (value.startDate || value.endDate)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["period"], message: "Use period or custom dates, not both." });
  }
});
