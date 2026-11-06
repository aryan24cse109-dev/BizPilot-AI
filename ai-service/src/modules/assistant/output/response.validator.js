
import {
  validateAssistantAIResponse
} from '../../../schemas/assistant.schema.js';

import {
  AI_RESPONSE_TYPES,
  CONFIRMATION_REQUIRED_ACTIONS
} from '../../../utils/constants.js';

export class AssistantOutputValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'AssistantOutputValidationError';
    this.details = details;
  }
}

export const validateAndNormalizeAssistantOutput = (input) => {
  const validation = validateAssistantAIResponse(input);

  if (!validation.success) {
    throw new AssistantOutputValidationError(
      'AI response does not match the assistant response schema.',
      validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    );
  }

  const response = validation.data;

  // Normalize workflow structure
  if (response.type === AI_RESPONSE_TYPES.WORKFLOW && !response.workflow) {
    response.type = AI_RESPONSE_TYPES.CONVERSATION;
  }

  if (response.type !== AI_RESPONSE_TYPES.WORKFLOW && response.workflow) {
    response.type = AI_RESPONSE_TYPES.WORKFLOW;
    response.intent = response.workflow.action;
  }

  if (response.workflow && response.intent !== response.workflow.action) {
    response.intent = response.workflow.action;
  }

  // Only workflow responses may contain an actionable intent.
  if (
    response.type === AI_RESPONSE_TYPES.WORKFLOW &&
    !response.intent
  ) {
    throw new AssistantOutputValidationError(
      'Workflow response must contain an intent.'
    );
  }

  // Confirmation policy is always controlled by server code.
  if (response.workflow) {
    response.workflow.requiresConfirmation =
      CONFIRMATION_REQUIRED_ACTIONS.includes(
        response.workflow.action
      );
  }

  // Clear fields that do not belong to the selected response type.
  if (response.type !== AI_RESPONSE_TYPES.CLARIFICATION) {
    response.clarificationQuestion = null;
  }

  return response;
};
