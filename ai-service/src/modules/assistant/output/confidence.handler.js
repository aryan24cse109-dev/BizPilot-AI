
import { AI_RESPONSE_TYPES } from '../../../utils/constants.js';

export const LOW_CONFIDENCE_THRESHOLD = 0.65;

const DEFAULT_CLARIFICATION_QUESTION =
  'Could you provide a little more detail so I can understand your request?';

export const applyConfidencePolicy = (
  response,
  threshold = LOW_CONFIDENCE_THRESHOLD
) => {
  if (
    !Number.isFinite(response?.confidence) ||
    response.confidence < 0 ||
    response.confidence > 1
  ) {
    throw new TypeError('Response confidence must be between 0 and 1.');
  }

  if (response.confidence >= threshold) {
    return response;
  }

  return {
    ...response,
    type: AI_RESPONSE_TYPES.CLARIFICATION,
    workflow: null,
    clarificationQuestion:
      response.clarificationQuestion ||
      DEFAULT_CLARIFICATION_QUESTION
  };
};
