
import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";

import { businessProfileController } from "./business.controller.js";

const router = Router();

router.get(
  "/profile",
  authenticate,
  authorize("BUSINESS"),
  businessProfileController
);

export default router;
