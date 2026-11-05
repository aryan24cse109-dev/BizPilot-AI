
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

import { analyzeAssistantRequest } from '../modules/assistant/analyzers/request.analyzer.js';

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

    // The server, not the AI model, decides which actions require confirmation.
    response.workflow.requiresConfirmation =
      CONFIRMATION_REQUIRED_ACTIONS.includes(
        response.workflow.action
      );
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

const buildLanguageAndIntentContext = (analysis) => {
  const languageNames = {
    english: 'English',
    hindi: 'Hindi',
    hinglish: 'Hinglish',
    unknown: 'Unknown'
  };

  return [
    'LANGUAGE AND INTENT ANALYSIS:',
    `Detected user language: ${languageNames[analysis.language] ?? 'Unknown'}.`,
    `Detected script: ${analysis.script}.`,
    `Detected intent hint: ${analysis.intent ?? 'UNKNOWN'}.`,
    `Intent detection source: ${analysis.intentSource}.`,
    `Follow-up message: ${analysis.isFollowUp ? 'Yes' : 'No'}.`,
    '',
    'INSTRUCTIONS:',
    '1. Understand the original user message in its detected language.',
    '2. Respond in the same language as the user unless another language is requested.',
    '3. Treat the detected intent as a hint, not as a final decision.',
    '4. Do not force the detected intent if the actual message means something different.',
    '5. Use conversation history to understand follow-up requests.',
    '6. If the request is ambiguous, return a clarification response.',
    '7. Never treat language or intent detection as authorization to execute an action.'
  ].join('\n');
};

export const createAssistantService = ({
  aiServiceImpl = aiService,
  loggerImpl = logger,
  requestAnalyzer = analyzeAssistantRequest
} = {}) => {
  const interpretMessage = async (input) => {
    // 1. Validate incoming request.
    const validation = validateAssistantRequest(input);

    if (!validation.success) {
      throw createValidationError(
        validation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      );
    }

    const { message, conversationHistory = [] } = validation.data;

    // 2. Detect language, intent and follow-up context.
    const requestAnalysis = requestAnalyzer({
      message,
      history: conversationHistory
    });

    // 3. Build AI messages with language and intent context.
    const messages = [
      {
        role: 'system',
        content: buildAssistantSystemPrompt()
      },
      {
        role: 'system',
        content: buildLanguageAndIntentContext(requestAnalysis)
      },
      {
        role: 'user',
        content: buildAssistantUserPrompt({
          message,
          conversationHistory
        })
      }
    ];

    // 4. Generate AI response using Sarvam primary and Groq fallback.
    const aiResult = await aiServiceImpl.generateChatCompletion({
      messages,
      temperature: 0.1,
      maxTokens: 1200
    });

    // 5. Parse AI response.
    const parsedResult = parseAIJson(aiResult.content);

    // 6. Validate and normalize AI response.
    const assistantResponse =
      normalizeAssistantResponse(parsedResult);

    // 7. Log sanitized interpretation details.
    loggerImpl.info('Assistant request interpreted successfully', {
      provider: aiResult.provider,
      detectedLanguage: requestAnalysis.language,
      detectedIntent: requestAnalysis.intent,
      finalIntent: assistantResponse.intent,
      responseType: assistantResponse.type,
      isFollowUp: requestAnalysis.isFollowUp
    });

    // 8. Return assistant response and Stage 6 analysis.
    return {
      ...assistantResponse,

      analysis: {
        language: requestAnalysis.language,
        script: requestAnalysis.script,
        isMixedLanguage: requestAnalysis.isMixedLanguage,
        detectedIntent: requestAnalysis.intent,
        intentSource: requestAnalysis.intentSource,
        isFollowUp: requestAnalysis.isFollowUp,
        needsClarification: requestAnalysis.needsClarification
      },

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
