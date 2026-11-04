
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

export async function sendEmail({ to, subject, text, html }) {
  if (env.EMAIL_PROVIDER === "console") {
    if (env.NODE_ENV === "production") {
      throw new ApiError(503, "Email delivery is not configured.");
    }

    console.info("Email delivery skipped in development:", {
      to,
      subject,
    });

    return {
      delivered: false,
      provider: "console",
    };
  }

  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
    throw new ApiError(503, "Email provider configuration is incomplete.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.EMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Email provider request failed:", {
      status: response.status,
    });

    throw new ApiError(502, "Unable to send invitation email.");
  }

  return {
    delivered: true,
    provider: "resend",
    messageId: result.id,
  };
}
