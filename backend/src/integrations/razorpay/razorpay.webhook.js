import { verifyWebhookSignature } from "./razorpay.signature.js";

export function parseVerifiedWebhook(rawBody, signature) {
  if (!verifyWebhookSignature(rawBody, signature)) return null;
  try {
    return JSON.parse(rawBody.toString("utf8"));
  } catch {
    return null;
  }
}