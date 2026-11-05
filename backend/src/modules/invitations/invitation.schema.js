
import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(40).max(200),
});
