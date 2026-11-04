
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

export async function completeOnboarding(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      businessProfile: true,
      clientProfile: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(404, "Active user account not found.");
  }

  if (user.accountCategory !== data.accountCategory) {
    throw new ApiError(
      403,
      "Your account category cannot be changed during onboarding."
    );
  }

  if (data.accountCategory === "BUSINESS") {
    if (user.clientProfile) {
      throw new ApiError(409, "This account already has a client profile.");
    }

    const {
      accountCategory,
      ...profileData
    } = data;

    return prisma.$transaction(async (tx) => {
      const profile = await tx.businessProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileData,
        },
        update: profileData,
      });

      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
      });

      return {
        accountCategory: "BUSINESS",
        profile,
      };
    });
  }

  if (user.businessProfile) {
    throw new ApiError(409, "This account already has a business profile.");
  }

  const {
    accountCategory,
    ...profileData
  } = data;

  return prisma.$transaction(async (tx) => {
    const profile = await tx.clientProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...profileData,
      },
      update: profileData,
    });

    await tx.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    return {
      accountCategory: "CLIENT",
      profile,
    };
  });
}
