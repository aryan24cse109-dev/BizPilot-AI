
import jwt from "jsonwebtoken";

import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { createTokenHash } from "../modules/auth/auth.service.js";

export async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.[env.SESSION_COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      throw new ApiError(401, "Authentication required.");
    }

    let decoded;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        issuer: "bizpilot-ai",
        audience: "bizpilot-ai-users",
      });
    } catch {
      throw new ApiError(401, "Invalid or expired session.");
    }

    if (!decoded.sub || !decoded.sid) {
      throw new ApiError(401, "Invalid session.");
    }

    const session = await prisma.authSession.findUnique({
      where: { id: decoded.sid },
      include: {
        user: true,
      },
    });

    if (
      !session ||
      session.userId !== decoded.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.tokenHash !== createTokenHash(token)
    ) {
      throw new ApiError(401, "Session expired or revoked.");
    }

    if (session.user.status !== "ACTIVE") {
      throw new ApiError(403, "Account is not active.");
    }

    req.user = session.user;
    req.sessionId = session.id;

    next();
  } catch (error) {
    next(error);
  }
}
