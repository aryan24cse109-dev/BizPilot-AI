import { ApiError } from "../utils/ApiError.js";
import { computeUserRoleCapabilities } from "../modules/auth/auth.service.js";

export function authorize(...allowedCategories) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, "Authentication required."));
      }

      // Resolve capabilities dynamically from actual business ownership & relationships
      const capabilities =
        req.user.roleCapabilities ||
        (await computeUserRoleCapabilities(req.user));
      req.user.roleCapabilities = capabilities;

      // 1. Check Business Access
      if (allowedCategories.includes("BUSINESS")) {
        if (capabilities.hasBusinessAccess) {
          return next();
        }
        return next(
          new ApiError(403, "A business workspace is required to access this resource.")
        );
      }

      // 2. Check Client Access
      if (allowedCategories.includes("CLIENT")) {
        if (capabilities.hasClientAccess) {
          return next();
        }
        return next(
          new ApiError(403, "Client access is restricted to registered clients or invoice recipients.")
        );
      }

      if (!allowedCategories.includes(req.user.accountCategory)) {
        return next(
          new ApiError(403, "You are not authorized to perform this action.")
        );
      }

      next();
    } catch (err) {
      next(err);
    }
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
