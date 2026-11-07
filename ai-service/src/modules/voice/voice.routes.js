import { Router } from "express";
import { transcribeVoiceController } from "./voice.controller.js";
import { serviceAuthMiddleware } from "../../middleware/serviceAuth.middleware.js";
import { aiRateLimiter } from "../../middleware/rateLimit.middleware.js";

const router = Router();
router.post("/transcribe", serviceAuthMiddleware, aiRateLimiter, transcribeVoiceController);
export default router;
