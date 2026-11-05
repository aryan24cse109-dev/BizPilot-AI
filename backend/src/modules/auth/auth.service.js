import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { verifyGoogleCredential } from "../../config/google.js";
import { ApiError } from "../../utils/ApiError.js";

const SESSION_SECONDS = env.SESSION_DURATION_DAYS * 24 * 60 * 60;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function linkInvoicesAndConnectionsToUser(user) {
  if (!user || !user.email) return;
  const normalizedEmail = user.email.toLowerCase().trim();

  try {
    // 1. Automatically link all unlinked invoices with this email to user.id
    await prisma.invoice.updateMany({
      where: {
        clientEmail: normalizedEmail,
        clientUserId: null,
      },
      data: {
        clientUserId: user.id,
      },
    });

    // 2. Mark any pending invitations for this email as accepted
    await prisma.invitation.updateMany({
      where: {
        email: normalizedEmail,
        status: "PENDING",
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: user.id,
      },
    });

    // 3. Ensure active connections between this user and all businesses that issued invoices to them
    const receivedInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { clientUserId: user.id },
          { clientEmail: normalizedEmail },
        ],
      },
      select: { businessUserId: true },
      distinct: ["businessUserId"],
    });

    for (const inv of receivedInvoices) {
      if (inv.businessUserId !== user.id) {
        await prisma.connection.upsert({
          where: {
            businessUserId_clientUserId: {
              businessUserId: inv.businessUserId,
              clientUserId: user.id,
            },
          },
          update: { status: "ACTIVE", acceptedAt: new Date() },
          create: {
            businessUserId: inv.businessUserId,
            clientUserId: user.id,
            status: "ACTIVE",
            acceptedAt: new Date(),
          },
        }).catch(() => {});
      }
    }

    // 4. Ensure client profile exists so client portal works smoothly
    const existingClientProfile = await prisma.clientProfile.findUnique({
      where: { userId: user.id },
    });
    if (!existingClientProfile) {
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          country: "India",
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("Auto-linking warning:", err.message);
  }
}

export async function googleLogin(credential, accountCategory, requestInfo) {
  const googleUser = await verifyGoogleCredential(credential);

  let user = await prisma.user.findUnique({
    where: { googleSubject: googleUser.googleSubject },
  });

  if (!user) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (existingEmailUser) {
      if (
        existingEmailUser.googleSubject &&
        existingEmailUser.googleSubject !== googleUser.googleSubject
      ) {
        throw new ApiError(409, "This email is linked to another Google account.");
      }

      user = await prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          googleSubject: googleUser.googleSubject,
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      if (!accountCategory) {
        throw new ApiError(
          400,
          "Choose BUSINESS or CLIENT when creating your account."
        );
      }

      const usernameBase = googleUser.email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 35) || "user";

      const username = `${usernameBase}_${crypto.randomBytes(3).toString("hex")}`;

      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          username,
          fullName: googleUser.fullName,
          googleSubject: googleUser.googleSubject,
          emailVerifiedAt: new Date(),
          accountCategory,
        },
      });
    }
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "This account is not active.");
  }

  // Dual-role email linking
  await linkInvoicesAndConnectionsToUser(user);

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);

  const token = jwt.sign(
    {
      sub: user.id,
      sid: sessionId,
    },
    env.JWT_SECRET,
    {
      expiresIn: SESSION_SECONDS,
      issuer: "bizpilot-ai",
      audience: "bizpilot-ai-users",
    }
  );

  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: requestInfo.ip || null,
      userAgent: requestInfo.userAgent || null,
    },
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      accountCategory: user.accountCategory,
      onboardingCompleted: user.onboardingCompleted,
    },
  };
}

export async function logoutSession(userId, sessionId) {
  await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getAuthenticatedUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      accountCategory: true,
      status: true,
      onboardingCompleted: true,
      businessProfile: true,
      clientProfile: true,
      createdAt: true,
    },
  });

  if (user) {
    linkInvoicesAndConnectionsToUser(user).catch(() => {});
  }

  return user;
}

export async function devLogin(email, accountCategory = "BUSINESS", fullName, requestInfo = {}) {
  if (env.NODE_ENV === "production") {
    throw new ApiError(403, "Dev login is not allowed in production.");
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { businessProfile: true, clientProfile: true },
  });

  if (!user) {
    const usernameBase = normalizedEmail
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 35) || "user";
    const username = `${usernameBase}_${crypto.randomBytes(3).toString("hex")}`;

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        fullName: fullName || normalizedEmail.split("@")[0],
        emailVerifiedAt: new Date(),
        accountCategory,
        onboardingCompleted: true,
      },
    });

    if (accountCategory === "BUSINESS") {
      await prisma.businessProfile.create({
        data: {
          userId: user.id,
          businessName: `${user.fullName}'s Business`,
          businessType: "STARTUP",
          currency: "INR",
          country: "India",
          city: "Bengaluru",
          addressLine1: "100 Feet Road, Indiranagar",
        },
      });
    } else {
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          phone: "+919876543210",
          country: "India",
          city: "Bengaluru",
          billingAddress: "100 Feet Road, Indiranagar",
        },
      });
    }
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "This account is not active.");
  }

  // Dual-role email linking
  await linkInvoicesAndConnectionsToUser(user);

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);

  const token = jwt.sign(
    {
      sub: user.id,
      sid: sessionId,
    },
    env.JWT_SECRET,
    {
      expiresIn: SESSION_SECONDS,
      issuer: "bizpilot-ai",
      audience: "bizpilot-ai-users",
    }
  );

  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: requestInfo.ip || null,
      userAgent: requestInfo.userAgent || null,
    },
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      accountCategory: user.accountCategory,
      onboardingCompleted: user.onboardingCompleted,
    },
  };
}

export function createTokenHash(token) {
  return hashToken(token);
}
