
import { aiService } from './ai.service.js';

import {
  validateAssistantRequest
} from '../schemas/assistant.schema.js';

import {
  buildAssistantSystemPrompt,
  buildAssistantUserPrompt
} from '../prompts/assistant.prompt.js';

import { parseAIJson } from '../utils/parseAIJson.js';

import {
  analyzeAssistantRequest
} from '../modules/assistant/analyzers/request.analyzer.js';

import {
  validateAndNormalizeAssistantOutput,
  AssistantOutputValidationError
} from '../modules/assistant/output/response.validator.js';

import {
  applyConfidencePolicy
} from '../modules/assistant/output/confidence.handler.js';

import {
  interpretWorkflow,
  WorkflowInterpretationError
} from '../modules/assistant/workflow/workflow.interpreter.js';

import {
  HTTP_STATUS,
  ERROR_CODES
} from '../utils/constants.js';

import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const createValidationError = (details) =>
  new ApiError({
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'Invalid assistant request.',
    code: ERROR_CODES.VALIDATION_ERROR,
    details
  });

const createInvalidAIResponseError = (error, stage) =>
  new ApiError({
    statusCode: HTTP_STATUS.BAD_GATEWAY,
    message: 'AI provider returned an invalid assistant response.',
    code: ERROR_CODES.AI_RESPONSE_INVALID,
    details: {
      stage,
      validationDetails: error?.details ?? null
    },
    cause: error
  });

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
    '2. Respond in the same language unless another language is requested.',
    '3. Treat detected intent as a hint, not a final decision.',
    '4. Do not force the detected intent if the actual message means something different.',
    '5. Use conversation history to understand follow-up requests.',
    '6. Return a clarification response when the request is ambiguous.',
    '7. Never treat language or intent detection as authorization to execute an action.',
    '8. Return only a JSON object matching the required response schema.'
  ].join('\n');
};

export const createAssistantService = ({
  aiServiceImpl = aiService,
  loggerImpl = logger,
  requestAnalyzer = analyzeAssistantRequest
} = {}) => {
  const interpretMessage = async (input) => {
    // 1. Validate the incoming request.
    const validation = validateAssistantRequest(input);

    if (!validation.success) {
      throw createValidationError(
        validation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      );
    }

    const {
      message,
      conversationHistory = [],
      context = {}
    } = validation.data;

    // 2. Analyze language, intent and conversation context.
    const requestAnalysis = requestAnalyzer({
      message,
      history: conversationHistory
    });

    // 3. Construct AI messages.
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
          conversationHistory,
          context
        })
      }
    ];

    // 4. Validate the complete output inside each provider attempt.
    // This enables the AI service to use Groq if Sarvam produces
    // invalid JSON, invalid schema output or an invalid workflow.
    const validateProviderResponse = (aiResult) => {
      let parsedResult;

      try {
        parsedResult = parseAIJson(aiResult.content);
      } catch (error) {
        loggerImpl.warn('AI response JSON parsing failed', {
          provider: aiResult.provider,
          model: aiResult.model,
          requestId: aiResult.requestId ?? null,
          errorCode: error.code ?? null
        });

        throw createInvalidAIResponseError(error, 'json_parse');
      }

      let validatedResponse;

      try {
        validatedResponse =
          validateAndNormalizeAssistantOutput(parsedResult);
      } catch (error) {
        if (error instanceof AssistantOutputValidationError) {
          loggerImpl.warn('AI response schema validation failed', {
            provider: aiResult.provider,
            issueCount: Array.isArray(error.details)
              ? error.details.length
              : null
          });

          throw createInvalidAIResponseError(
            error,
            'schema_validation'
          );
        }

        throw error;
      }

      // 5. Apply server-side confidence policy.
      let confidenceCheckedResponse;

      try {
        confidenceCheckedResponse =
          applyConfidencePolicy(validatedResponse);
      } catch (error) {
        loggerImpl.warn('AI response confidence policy failed', {
          provider: aiResult.provider,
          model: aiResult.model,
          requestId: aiResult.requestId ?? null,
          errorName: error.name
        });

        throw createInvalidAIResponseError(error, 'confidence_policy');
      }

      // 6. Interpret and validate workflow requirements.
      let workflowResult;

      try {
        workflowResult = interpretWorkflow(
          confidenceCheckedResponse
        );
      } catch (error) {
        if (error instanceof WorkflowInterpretationError) {
          loggerImpl.warn('AI workflow interpretation failed', {
            provider: aiResult.provider,
            errorName: error.name
          });

          throw createInvalidAIResponseError(
            error,
            'workflow_interpretation'
          );
        }

        throw error;
      }

      return {
        assistantResponse: workflowResult.response,
        workflowResult
      };
    };

    // 7. Generate, parse, validate and interpret.
    // The AI service controls the single fallback attempt.
    const aiResult = await aiServiceImpl.generateChatCompletion(
      {
        messages,
        temperature: 0.1,
        maxTokens: 1500,
        responseFormat: {
          type: 'json_object'
        }
      },
      {
        validateResponse: validateProviderResponse
      }
    );

    const {
      assistantResponse,
      workflowResult
    } = aiResult.validatedResponse;

    // 8. Log sanitized response metadata.
    loggerImpl.info('Assistant request interpreted successfully', {
      provider: aiResult.provider,
      model: aiResult.model,
      detectedLanguage: requestAnalysis.language,
      detectedIntent: requestAnalysis.intent,
      finalIntent: assistantResponse.intent,
      responseType: assistantResponse.type,
      confidence: assistantResponse.confidence,
      isFollowUp: requestAnalysis.isFollowUp,
      workflowAction:
        workflowResult.interpretation.action ?? null,
      workflowComplete:
        workflowResult.interpretation.isComplete,
      fallbackFrom: aiResult.fallbackFrom ?? null
    });

    // 9. Return the normalized response and workflow interpretation.
    return {
      ...assistantResponse,

      analysis: {
        language: requestAnalysis.language,
        script: requestAnalysis.script,
        isMixedLanguage: requestAnalysis.isMixedLanguage,
        detectedIntent: requestAnalysis.intent,
        intentSource: requestAnalysis.intentSource,
        isFollowUp: requestAnalysis.isFollowUp,
        needsClarification:
          requestAnalysis.needsClarification ||
          !workflowResult.interpretation.isComplete
      },

      workflowInterpretation:
        workflowResult.interpretation,

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
