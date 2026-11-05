
import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import {
  authorize,
  requireOnboarding
} from "../../middleware/authorize.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";

import { invitationRateLimiter } from "../../middleware/rateLimit.middleware.js";

import {
  createInvitationSchema,
  acceptInvitationSchema,
} from "./invitation.schema.js";

import {
  createInvitationController,
  acceptInvitationController,
} from "./invitation.controller.js";

const router = Router();

router.use(authenticate, requireOnboarding);

router.post(
  "/",
  authorize("BUSINESS"),
  invitationRateLimiter,
  validate(createInvitationSchema),
  createInvitationController
);

router.post(
  "/accept",
  authorize("CLIENT"),
  validate(acceptInvitationSchema),
  acceptInvitationController
);

export default router;
