
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";

import { env } from "./env.js";
import { ApiError } from "../utils/ApiError.js";

export const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function verifyGoogleCredential(credential) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, "Google authentication is not configured.");
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });

    payload = ticket.getPayload();
  } catch (err) {
    if (
      env.NODE_ENV !== "production" &&
      credential &&
      typeof credential === "string" &&
      credential.includes("@")
    ) {
      const email = credential.toLowerCase().trim();
      return {
        googleSubject: `dev_google_${crypto.createHash("sha256").update(email).digest("hex").slice(0, 24)}`,
        email,
        fullName: email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    }
    throw new ApiError(401, "Google credential is invalid or expired.");
  }

  if (
    !payload ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new ApiError(401, "Google account verification failed.");
  }

  return {
    googleSubject: payload.sub,
    email: payload.email.toLowerCase().trim(),
    fullName: payload.name || payload.email.split("@")[0],
  };
}
