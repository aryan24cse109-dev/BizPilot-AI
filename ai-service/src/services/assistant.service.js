
import { aiService } from './ai.service.js';

import {
  validateAssistantRequest,
  validateAssistantAIResponse
} from '../schemas/assistant.schema.js';

import {
  buildAssistantSystemPrompt,
  buildAssistantUserPrompt
} from '../prompts/assistant.prompt.js';

import { parseAIJson } from '../utils/parseAIJson.js';

import {
  CONFIRMATION_REQUIRED_ACTIONS,
  HTTP_STATUS,
  ERROR_CODES
} from '../utils/constants.js';

import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const LOW_CONFIDENCE_THRESHOLD = 0.65;

const createValidationError = (details) =>
  new ApiError({
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'Invalid assistant request.',
    code: ERROR_CODES.VALIDATION_ERROR,
    details
  });

const createInvalidAIResponseError = () =>
  new ApiError({
    statusCode: HTTP_STATUS.BAD_GATEWAY,
    message: 'AI provider returned an invalid assistant response.',
    code: ERROR_CODES.AI_RESPONSE_INVALID
  });

const normalizeAssistantResponse = (result) => {
  const parsed = validateAssistantAIResponse(result);

  if (!parsed.success) {
    throw createInvalidAIResponseError();
  }

  const response = parsed.data;

  if (response.workflow) {
    if (response.intent !== response.workflow.action) {
      throw createInvalidAIResponseError();
    }

    // The server, not the model, decides which actions require confirmation.
    response.workflow.requiresConfirmation =
      CONFIRMATION_REQUIRED_ACTIONS.includes(response.workflow.action);
  }

  if (response.confidence < LOW_CONFIDENCE_THRESHOLD) {
    response.type = 'clarification';
    response.workflow = null;
    response.clarificationQuestion =
      response.clarificationQuestion ||
      'Could you provide a little more detail so I can understand your request?';
  }

  if (response.type !== 'workflow') {
    response.workflow = null;
  }

  if (response.type !== 'clarification') {
    response.clarificationQuestion = null;
  }

  return response;
};

export const createAssistantService = ({
  aiServiceImpl = aiService,
  loggerImpl = logger
} = {}) => {
  const interpretMessage = async (input) => {
    const validation = validateAssistantRequest(input);

    if (!validation.success) {
      throw createValidationError(
        validation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      );
    }

    const { message, conversationHistory } = validation.data;

    const messages = [
      {
        role: 'system',
        content: buildAssistantSystemPrompt()
      },
      {
        role: 'user',
        content: buildAssistantUserPrompt({
          message,
          conversationHistory
        })
      }
    ];

    const aiResult = await aiServiceImpl.generateChatCompletion({
      messages,
      temperature: 0.1,
      maxTokens: 1200
    });

    const parsedResult = parseAIJson(aiResult.content);

    const assistantResponse =
      normalizeAssistantResponse(parsedResult);

    loggerImpl.info('Assistant request interpreted successfully', {
      provider: aiResult.provider,
      intent: assistantResponse.intent,
      responseType: assistantResponse.type
    });

    return {
      ...assistantResponse,
      provider: aiResult.provider,
      model: aiResult.model,
      fallbackFrom: aiResult.fallbackFrom ?? null
    };
  };

  return Object.freeze({
    interpretMessage
  });
};

export const assistantService = createAssistantService();
