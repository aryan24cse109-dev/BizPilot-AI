import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  executeWorkflowController,
  interpretAssistantController,
  transcribeVoiceController,
} from "./assistant.controller.js";

const router = Router();
router.use(authenticate);
router.post("/message", asyncHandler(interpretAssistantController));
router.post("/workflows/execute", asyncHandler(executeWorkflowController));
router.post("/voice/transcribe", asyncHandler(transcribeVoiceController));
export default router;