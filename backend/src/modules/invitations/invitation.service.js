
import crypto from "node:crypto";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

import { sendEmail } from "../../integrations/email/email.service.js";
import { clientInvitationTemplate } from "../../integrations/email/email.templates.js";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createClientInvitation(businessUserId, email) {
  const business = await prisma.user.findUnique({
    where: { id: businessUserId },
    include: { businessProfile: true },
  });

  if (
    !business ||
    business.accountCategory !== "BUSINESS" ||
    !business.onboardingCompleted ||
    !business.businessProfile
  ) {
    throw new ApiError(403, "A completed business account is required.");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      accountCategory: true,
    },
  });

  if (existingUser) {
    // If client is already registered, connect them immediately so they are in the client directory
    const connection = await prisma.connection.upsert({
      where: {
        businessUserId_clientUserId: {
          businessUserId,
          clientUserId: existingUser.id,
        },
      },
      update: { status: "ACTIVE", acceptedAt: new Date() },
      create: {
        businessUserId,
        clientUserId: existingUser.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    return {
      id: connection.id,
      email: normalizedEmail,
      status: "ACTIVE",
      delivery: { delivered: true },
      connected: true,
    };
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      businessUserId,
      email: normalizedEmail,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    return {
      id: existingInvitation.id,
      email: normalizedEmail,
      status: existingInvitation.status,
      expiresAt: existingInvitation.expiresAt,
      delivery: { delivered: true },
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const invitation = await prisma.invitation.create({
    data: {
      businessUserId,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  const invitationUrl = new URL(
    "/invitations/accept",
    env.FRONTEND_URL
  );

  invitationUrl.searchParams.set("token", rawToken);

  const template = clientInvitationTemplate({
    businessName: business.businessProfile.businessName,
    invitationUrl: invitationUrl.toString(),
  });

  const delivery = await sendEmail({
    to: email,
    ...template,
  });

  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    delivery,

    // Only expose the raw invitation URL in local development.
    developmentInvitationUrl:
      env.NODE_ENV === "development" && !delivery.delivered
        ? invitationUrl.toString()
        : undefined,
  };
}

export async function acceptClientInvitation(clientUser, rawToken) {
  if (clientUser.accountCategory !== "CLIENT") {
    throw new ApiError(403, "Only client accounts can accept this invitation.");
  }

  if (!clientUser.emailVerifiedAt) {
    throw new ApiError(403, "Verify your email before accepting invitations.");
  }

  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new ApiError(404, "Invitation not found.");
    }

    if (invitation.status !== "PENDING") {
      throw new ApiError(409, "This invitation has already been used or revoked.");
    }

    if (invitation.expiresAt <= new Date()) {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      throw new ApiError(410, "This invitation has expired.");
    }

    if (invitation.email.toLowerCase() !== clientUser.email.toLowerCase()) {
      throw new ApiError(
        403,
        "Sign in using the email address that received this invitation."
      );
    }

    const existingConnection = await tx.connection.findUnique({
      where: {
        businessUserId_clientUserId: {
          businessUserId: invitation.businessUserId,
          clientUserId: clientUser.id,
        },
      },
    });

    if (existingConnection) {
      throw new ApiError(409, "A connection already exists between these accounts.");
    }

    const connection = await tx.connection.create({
      data: {
        businessUserId: invitation.businessUserId,
        clientUserId: clientUser.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    const updated = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: clientUser.id,
      },
    });

    if (updated.count !== 1) {
      throw new ApiError(409, "Invitation could not be accepted.");
    }

    await tx.notification.create({
      data: {
        userId: invitation.businessUserId,
        type: "CONNECTION_ACCEPTED",
        title: "Invitation accepted",
        body: "Your invited client has joined and connected with your business.",
        data: {
          invitationId: invitation.id,
          connectionId: connection.id,
        },
      },
    });

    return {
      invitationId: invitation.id,
      connectionId: connection.id,
      status: "ACTIVE",
    };
  });
}

export async function listMyInvitations(businessUserId) {
  return prisma.invitation.findMany({
    where: { businessUserId },
    orderBy: { createdAt: "desc" },
    include: {
      acceptedByUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          clientProfile: true,
        },
      },
    },
  });
}
