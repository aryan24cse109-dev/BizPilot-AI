import { ApiError } from "../utils/ApiError.js";

export function authorize(...allowedCategories) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    // Dual-role authorization:
    // 1. Any authenticated user can act as a CLIENT
    if (allowedCategories.includes("CLIENT")) {
      return next();
    }

    // 2. A user can act as BUSINESS if they have BUSINESS category or a business profile
    if (allowedCategories.includes("BUSINESS")) {
      if (req.user.accountCategory === "BUSINESS" || req.user.businessProfile) {
        return next();
      }
      return next(
        new ApiError(403, "A business account or business profile is required.")
      );
    }

    if (!allowedCategories.includes(req.user.accountCategory)) {
      return next(
        new ApiError(403, "You are not authorized to perform this action.")
      );
    }

    next();
  };
}

export function requireOnboarding(req, res, next) {
  // If user is accessing as client or already has active profiles, allow
  if (!req.user?.onboardingCompleted && req.user?.accountCategory === "BUSINESS" && !req.user?.businessProfile) {
    return next(
      new ApiError(403, "Please complete onboarding first.")
    );
  }

  next();
}
