
import {
  AI_RESPONSE_TYPES,
  CONFIRMATION_REQUIRED_ACTIONS
} from '../../../utils/constants.js';

import { getWorkflowRule } from './workflow.rules.js';

import {
  normalizeWorkflowParameters,
  hasMeaningfulValue,
  validateInvoiceItems
} from './workflow.normalizer.js';

export class WorkflowInterpretationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'WorkflowInterpretationError';
    this.details = details;
  }
}

const getMissingRequirements = (action, parameters) => {
  const rule = getWorkflowRule(action);

  if (!rule) {
    throw new WorkflowInterpretationError(
      `Unsupported workflow action: ${action}`
    );
  }

  const missing = [];

  for (const field of rule.required) {
    if (!hasMeaningfulValue(parameters[field])) {
      missing.push({
        type: 'required',
        fields: [field]
      });
    }
  }

  for (const group of rule.requiredAnyOf) {
    const hasOneValue = group.some((field) =>
      hasMeaningfulValue(parameters[field])
    );

    if (!hasOneValue) {
      missing.push({
        type: 'one_of',
        fields: group
      });
    }
  }

  return missing;
};

const buildClarificationQuestion = (missingRequirements) => {
  const firstMissing = missingRequirements[0];

  if (!firstMissing) {
    return 'Could you provide a little more information about your request?';
  }

  if (firstMissing.type === 'one_of') {
    const fields = firstMissing.fields;

    if (fields.includes('invoiceId') || fields.includes('invoiceNumber')) {
      return 'Please provide the invoice ID or invoice number.';
    }

    if (fields.includes('clientName') || fields.includes('clientEmail')) {
      return 'Please provide the client name or client email address.';
    }

    if (fields.includes('items') || fields.includes('lineItems')) {
      return 'Please provide the invoice items or amount.';
    }

    if (fields.includes('message') || fields.includes('purpose')) {
      return 'What should the message be about?';
    }
  }

  return `Please provide: ${firstMissing.fields.join(' or ')}.`;
};

export const interpretWorkflow = (assistantResponse) => {
  if (
    !assistantResponse ||
    assistantResponse.type !== AI_RESPONSE_TYPES.WORKFLOW ||
    !assistantResponse.workflow
  ) {
    return {
      response: assistantResponse,
      interpretation: {
        isWorkflow: false,
        isComplete: true,
        missingRequirements: [],
        requiresConfirmation: false
      }
    };
  }

  const { action } = assistantResponse.workflow;
  const rule = getWorkflowRule(action);

  if (!rule) {
    throw new WorkflowInterpretationError(
      `Unsupported workflow action: ${action}`,
      { action }
    );
  }

  let parameters;
  try {
    parameters = normalizeWorkflowParameters({
      parameters: assistantResponse.workflow.parameters,
      entities: assistantResponse.entities
    });
    if (action === 'CREATE_INVOICE_DRAFT' && parameters.items !== undefined) {
      validateInvoiceItems(parameters.items);
    }
  } catch (error) {
    throw new WorkflowInterpretationError(
      'Invoice workflow parameters are invalid.',
      { reason: error.message }
    );
  }

  const missingRequirements = getMissingRequirements(
    action,
    parameters
  );

  const requiresConfirmation =
    CONFIRMATION_REQUIRED_ACTIONS.includes(action);

  if (missingRequirements.length > 0) {
    const clarificationQuestion =
      buildClarificationQuestion(missingRequirements);

    return {
      response: {
        ...assistantResponse,
        type: AI_RESPONSE_TYPES.CLARIFICATION,
        workflow: null,
        clarificationQuestion,
        response: clarificationQuestion
      },

      interpretation: {
        isWorkflow: true,
        isComplete: false,
        action,
        missingRequirements,
        requiresConfirmation
      }
    };
  }

  return {
    response: {
      ...assistantResponse,
      workflow: {
        ...assistantResponse.workflow,
        action,
        parameters,
        requiresConfirmation
      }
    },

    interpretation: {
      isWorkflow: true,
      isComplete: true,
      action,
      missingRequirements: [],
      requiresConfirmation
    }
  };
};
