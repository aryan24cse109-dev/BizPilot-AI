import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { z } from "zod";
import { workflowSchema } from "./assistant.schema.js";
import { assistantMessageSchema } from "./assistant.schema.js";
import {
  executeWorkflow,
  interpretAssistantMessage,
} from "./assistant.service.js";
import { aiClient } from "../../integrations/ai/ai.client.js";

const voiceSchema = z.object({
  audio: z.string().regex(/^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/i),
  language: z.enum(["unknown", "en-IN", "hi-IN"]).default("unknown"),
}).strict();

export async function executeWorkflowController(req, res) {
  const result = workflowSchema.safeParse(req.body);
  if (!result.success) throw new ApiError(400, "Validation failed.", result.error.issues);
  const output = await executeWorkflow(req.user, result.data);
  const status = output.confirmationRequired ? 409 : 200;
  return res.status(status).json(
    new ApiResponse(status, output.confirmationRequired ? "Confirmation required." : "Workflow executed successfully.", output),
  );
}

export async function interpretAssistantController(req, res) {
  const result = assistantMessageSchema.safeParse(req.body);
  if (!result.success) throw new ApiError(400, "Validation failed.", result.error.issues);

  const output = await interpretAssistantMessage(req.user, result.data);
  const status = output.confirmationRequired ? 409 : 200;
  return res.status(status).json(
    new ApiResponse(
      status,
      output.confirmationRequired
        ? "Confirmation required."
        : output.status === "clarification_required"
          ? "Clarification required."
          : "Assistant request completed.",
      output,
    ),
  );
}

export async function transcribeVoiceController(req, res) {
  const result = voiceSchema.safeParse(req.body);
  if (!result.success) throw new ApiError(400, "Valid audio data is required.", result.error.issues);
  if (Buffer.byteLength(result.data.audio, "utf8") > 950 * 1024) {
    throw new ApiError(413, "Audio recording is too large.");
  }
  const output = await aiClient.transcribe(result.data);
  return res.json(new ApiResponse(200, "Voice transcribed successfully.", output));
}