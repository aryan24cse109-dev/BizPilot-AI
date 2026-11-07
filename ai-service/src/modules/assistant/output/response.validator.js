
import {
  validateAssistantAIResponse
} from '../../../schemas/assistant.schema.js';

import {
  AI_RESPONSE_TYPES,
  CONFIRMATION_REQUIRED_ACTIONS,
  WORKFLOW_ACTIONS
} from '../../../utils/constants.js';

const validWorkflowActions = new Set(
  Object.values(WORKFLOW_ACTIONS)
);

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

  if (
    response.workflow &&
    !validWorkflowActions.has(response.workflow.action)
  ) {
    throw new AssistantOutputValidationError(
      'AI response contains an unsupported workflow action.',
      { field: 'workflow.action' }
    );
  }

  if (
    response.type === AI_RESPONSE_TYPES.WORKFLOW &&
    !response.workflow
  ) {
    throw new AssistantOutputValidationError(
      'Workflow response must contain a workflow object.',
      { field: 'workflow' }
    );
  }

  if (
    response.type !== AI_RESPONSE_TYPES.WORKFLOW &&
    response.workflow
  ) {
    throw new AssistantOutputValidationError(
      'Non-workflow response cannot contain a workflow object.',
      { field: 'workflow' }
    );
  }

  if (
    response.workflow &&
    response.intent !== response.workflow.action
  ) {
    throw new AssistantOutputValidationError(
      'Workflow intent must match its workflow action.',
      {
        field: 'intent',
        expected: response.workflow.action
      }
    );
  }

  if (response.type !== AI_RESPONSE_TYPES.WORKFLOW) {
    response.intent = null;
    response.workflow = null;
  }

  if (response.type !== AI_RESPONSE_TYPES.CLARIFICATION) {
    response.clarificationQuestion = null;
  }

  // Confirmation requirements are controlled by the server.
  if (response.workflow) {
    response.workflow.requiresConfirmation =
      CONFIRMATION_REQUIRED_ACTIONS.includes(
        response.workflow.action
      );
  }

  return response;
};
