
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
