
import { Router } from "express";

import {
  authenticate
} from "../../middleware/auth.middleware.js";

import {
  authorize,
  requireOnboarding
} from "../../middleware/authorize.middleware.js";

import { validate } from "../../middleware/validate.middleware.js";

import {
  createConnectionSchema,
  respondConnectionSchema,
} from "./connection.schema.js";

import {
  createConnectionController,
  respondConnectionController,
  listConnectionsController,
} from "./connection.controller.js";

const router = Router();

router.use(authenticate, requireOnboarding);

router.get("/", listConnectionsController);

router.post(
  "/",
  authorize("BUSINESS"),
  validate(createConnectionSchema),
  createConnectionController
);

router.patch(
  "/:id/respond",
  authorize("CLIENT"),
  validate(respondConnectionSchema),
  respondConnectionController
);

export default router;
