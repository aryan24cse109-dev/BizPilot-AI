
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

export async function createConnectionRequest(businessUserId, username) {
  const business = await prisma.user.findUnique({
    where: { id: businessUserId },
    select: {
      accountCategory: true,
      onboardingCompleted: true,
    },
  });

  if (
    !business ||
    business.accountCategory !== "BUSINESS" ||
    !business.onboardingCompleted
  ) {
    throw new ApiError(403, "A completed business account is required.");
  }

  const client = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      accountCategory: true,
      status: true,
      onboardingCompleted: true,
    },
  });

  if (!client || client.accountCategory !== "CLIENT" || client.status !== "ACTIVE") {
    throw new ApiError(404, "Registered client account not found.");
  }

  if (!client.onboardingCompleted) {
    throw new ApiError(409, "The client has not completed onboarding.");
  }

  if (client.id === businessUserId) {
    throw new ApiError(400, "You cannot connect to your own account.");
  }

  const existing = await prisma.connection.findUnique({
    where: {
      businessUserId_clientUserId: {
        businessUserId,
        clientUserId: client.id,
      },
    },
  });

  if (existing) {
    if (existing.status === "ACTIVE") {
      throw new ApiError(409, "You are already connected to this client.");
    }

    if (existing.status === "PENDING") {
      throw new ApiError(409, "A connection request is already pending.");
    }

    throw new ApiError(
      409,
      "A previous connection exists. Contact support if you need it reopened."
    );
  }

  return prisma.$transaction(async (tx) => {
    const connection = await tx.connection.create({
      data: {
        businessUserId,
        clientUserId: client.id,
      },
    });

    await tx.notification.create({
      data: {
        userId: client.id,
        type: "CONNECTION_REQUEST",
        title: "New business connection request",
        body: `A business account has requested to connect with you.`,
        data: {
          connectionId: connection.id,
          businessUserId,
        },
      },
    });

    return {
      id: connection.id,
      status: connection.status,
      client: {
        id: client.id,
        username: client.username,
        fullName: client.fullName,
        email: client.email,
      },
    };
  });
}

export async function respondToConnection(clientUserId, connectionId, decision) {
  return prisma.$transaction(async (tx) => {
    const connection = await tx.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.clientUserId !== clientUserId) {
      throw new ApiError(404, "Connection request not found.");
    }

    if (connection.status !== "PENDING") {
      throw new ApiError(409, "This connection request is no longer pending.");
    }

    const newStatus = decision === "ACCEPT" ? "ACTIVE" : "REJECTED";

    const result = await tx.connection.updateMany({
      where: {
        id: connectionId,
        clientUserId,
        status: "PENDING",
      },
      data: {
        status: newStatus,
        acceptedAt: decision === "ACCEPT" ? new Date() : null,
        rejectedAt: decision === "REJECT" ? new Date() : null,
      },
    });

    if (result.count !== 1) {
      throw new ApiError(409, "The request was already processed.");
    }

    await tx.notification.create({
      data: {
        userId: connection.businessUserId,
        type: decision === "ACCEPT"
          ? "CONNECTION_ACCEPTED"
          : "SYSTEM",
        title: decision === "ACCEPT"
          ? "Connection accepted"
          : "Connection request rejected",
        body: decision === "ACCEPT"
          ? "Your business-client connection request was accepted."
          : "Your connection request was rejected.",
        data: { connectionId },
      },
    });

    return {
      id: connectionId,
      status: newStatus,
    };
  });
}

export async function listMyConnections(userId, accountCategory) {
  const where =
    accountCategory === "BUSINESS"
      ? { businessUserId: userId }
      : { clientUserId: userId };

  return prisma.connection.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      businessUser: {
        select: { id: true, username: true, fullName: true },
      },
      clientUser: {
        select: { id: true, username: true, fullName: true },
      },
    },
  });
}
