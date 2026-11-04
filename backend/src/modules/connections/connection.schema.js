
import { z } from "zod";

export const createConnectionSchema = z.object({
  username: z.string().trim().min(3).max(50),
});

export const respondConnectionSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
});
