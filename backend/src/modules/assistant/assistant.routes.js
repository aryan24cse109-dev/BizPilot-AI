import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { executeWorkflowController } from "./assistant.controller.js";

const router = Router();
router.use(authenticate);
router.post("/workflows/execute", asyncHandler(executeWorkflowController));
export default router;