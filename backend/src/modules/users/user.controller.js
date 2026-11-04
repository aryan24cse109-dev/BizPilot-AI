
import { completeOnboarding } from "./user.service.js";

export async function onboardingController(req, res, next) {
  try {
    const result = await completeOnboarding(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Onboarding completed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
