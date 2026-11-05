
import { z } from "zod";

export const googleLoginSchema = z.object({
  credential: z.string().min(20).max(10000),

  accountCategory: z
    .enum(["BUSINESS", "CLIENT"])
    .optional(),
});
