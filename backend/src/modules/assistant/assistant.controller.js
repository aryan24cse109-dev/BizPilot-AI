import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { workflowSchema } from "./assistant.schema.js";
import { assistantMessageSchema } from "./assistant.schema.js";
import {
  executeWorkflow,
  interpretAssistantMessage,
} from "./assistant.service.js";

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