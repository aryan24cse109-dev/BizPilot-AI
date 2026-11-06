
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

export async function getBusinessProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountCategory: true,
      businessProfile: true,
    },
  });

  if (!user || user.accountCategory !== "BUSINESS") {
    throw new ApiError(403, "Business account required.");
  }

  if (!user.businessProfile) {
    throw new ApiError(404, "Business profile not found.");
  }

  return user.businessProfile;
}

export async function updateBusinessProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountCategory: true,
      businessProfile: true,
    },
  });

  if (!user || user.accountCategory !== "BUSINESS") {
    throw new ApiError(403, "Business account required.");
  }

  const { id, userId: uId, createdAt, updatedAt, ...allowedFields } = data;

  const profile = await prisma.businessProfile.upsert({
    where: { userId },
    update: allowedFields,
    create: {
      userId,
      businessName: allowedFields.businessName || "My Business",
      businessType: allowedFields.businessType || "STARTUP",
      ...allowedFields,
    },
  });

  return profile;
}
