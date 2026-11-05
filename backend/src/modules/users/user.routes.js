
import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";

import { onboardingSchema } from "./user.schema.js";
import { onboardingController } from "./user.controller.js";

const router = Router();

router.post(
  "/onboarding",
  authenticate,
  validate(onboardingSchema),
  onboardingController
);

export default router;
