import { env } from "./env.js";
import { ApiError } from "../utils/ApiError.js";

export function requireRazorpayConfiguration() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(503, "Razorpay payments are not configured.");
  }
}

export function getRazorpayPublicKey() {
  requireRazorpayConfiguration();
  return env.RAZORPAY_KEY_ID;
}