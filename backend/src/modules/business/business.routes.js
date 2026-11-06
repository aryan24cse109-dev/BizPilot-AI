
import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";

import {
  businessProfileController,
  updateBusinessProfileController
} from "./business.controller.js";

const router = Router();

router.get(
  "/profile",
  authenticate,
  authorize("BUSINESS"),
  businessProfileController
);

router.patch(
  "/profile",
  authenticate,
  authorize("BUSINESS"),
  updateBusinessProfileController
);

export default router;
