
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

const ALLOWED_BUSINESS_FIELDS = new Set([
  "businessType",
  "businessName",
  "legalName",
  "description",
  "businessEmail",
  "phone",
  "website",
  "gstin",
  "country",
  "currency",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "bankAccountName",
  "bankAccountNumber",
  "bankIfscCode",
  "bankName",
  "upiId",
  "paymentInstructions",
]);

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

  const cleanData = {};
  for (const [key, val] of Object.entries(data || {})) {
    if (ALLOWED_BUSINESS_FIELDS.has(key)) {
      cleanData[key] = val === "" ? null : val;
    }
  }

  const profile = await prisma.businessProfile.upsert({
    where: { userId },
    update: cleanData,
    create: {
      userId,
      businessName: cleanData.businessName || "My Business",
      businessType: cleanData.businessType || "STARTUP",
      ...cleanData,
    },
  });

  return profile;
}
