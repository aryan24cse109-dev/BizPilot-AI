import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { requireRazorpayConfiguration } from "../../config/razorpay.js";

async function request(path, options = {}) {
  requireRazorpayConfiguration();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
      ).toString("base64")}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Razorpay request failed:", {
      status: response.status,
      code: body?.error?.code,
    });
    throw new ApiError(502, "Razorpay is temporarily unavailable.");
  }
  return body;
}

export function createRazorpayOrder({ amount, currency, receipt, notes }) {
  return request("/orders", {
    method: "POST",
    body: JSON.stringify({ amount, currency, receipt, notes }),
  });
}

export function getRazorpayPayment(paymentId) {
  return request(`/payments/${encodeURIComponent(paymentId)}`);
}