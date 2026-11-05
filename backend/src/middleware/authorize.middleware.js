
import { ApiError } from "../utils/ApiError.js";

export function authorize(...allowedCategories) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
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
  if (!req.user?.onboardingCompleted) {
    return next(
      new ApiError(403, "Please complete onboarding first.")
    );
  }

  next();
}
