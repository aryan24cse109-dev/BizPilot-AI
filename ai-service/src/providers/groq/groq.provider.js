
import { z } from 'zod';

import { env } from '../../config/env.js';
import { getProviderConfig } from '../../config/provider.config.js';

import { GROQ_CONFIG } from './groq.config.js';

import { ApiError } from '../../utils/ApiError.js';

import {
  HTTP_STATUS,
  ERROR_CODES
} from '../../utils/constants.js';

import { logger } from '../../utils/logger.js';

const messageSchema = z.object({
  role: z.enum(GROQ_CONFIG.supportedRoles),
  content: z.string().min(1).max(100000)
}).strict();

const completionSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8192).optional()
}).strict();

const normalizeResponse = (response, requestedModel) => {
  const choice = response?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError({
      statusCode: HTTP_STATUS.BAD_GATEWAY,
      message: 'Groq returned an invalid or empty response.',
      code: ERROR_CODES.AI_RESPONSE_INVALID,
      details: {
        provider: 'groq'
      }
    });
  }

  return {
    provider: 'groq',
    model: response.model ?? requestedModel,
    content: content.trim(),
    finishReason: choice.finish_reason ?? null,

    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens ?? null,
          completionTokens: response.usage.completion_tokens ?? null,
          totalTokens: response.usage.total_tokens ?? null
        }
      : null,

    requestId: response.id ?? null
  };
};

const parseProviderError = async (response) => {
  try {
    const body = await response.json();

    return {
      providerStatus: response.status,
      providerMessage:
        body?.error?.message ??
        body?.message ??
        'Groq API request failed.'
    };
  } catch {
    return {
      providerStatus: response.status,
      providerMessage: 'Groq API request failed.'
    };
  }
};

export const createGroqProvider = ({
  apiKey,
  model = GROQ_CONFIG.defaultModel,
  baseUrl = GROQ_CONFIG.baseUrl,
  timeoutMs = env.AI_REQUEST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
} = {}) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A valid fetch implementation is required.');
  }

  const generateChatCompletion = async (input) => {
    const parsedInput = completionSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new ApiError({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Invalid Groq chat completion request.',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: parsedInput.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    if (!apiKey) {
      throw new ApiError({
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Groq API key is not configured.',
        code: ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
        details: {
          provider: 'groq',
          reason: 'missing_api_key'
        }
      });
    }

    const {
      messages,
      model: requestedModel,
      temperature,
      maxTokens
    } = parsedInput.data;

    const selectedModel = requestedModel ?? model;

    const url = new URL(
      GROQ_CONFIG.chatCompletionsPath,
      baseUrl
    );

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: selectedModel,
          messages,

          temperature:
            temperature ?? GROQ_CONFIG.defaultTemperature,

          max_completion_tokens:
            maxTokens ?? GROQ_CONFIG.defaultMaxTokens
        }),

        signal: controller.signal
      });

      if (!response.ok) {
        const providerError = await parseProviderError(response);

        logger.warn('Groq API returned an error', {
          provider: 'groq',
          providerStatus: response.status
        });

        throw new ApiError({
          statusCode:
            response.status === 429 || response.status >= 500
              ? HTTP_STATUS.SERVICE_UNAVAILABLE
              : HTTP_STATUS.BAD_GATEWAY,

          message: 'Groq AI request failed.',

          code: ERROR_CODES.AI_PROVIDER_ERROR,

          details: {
            provider: 'groq',
            providerStatus: providerError.providerStatus
          }
        });
      }

      const responseData = await response.json();

      return normalizeResponse(responseData, selectedModel);

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new ApiError({
          statusCode: HTTP_STATUS.GATEWAY_TIMEOUT,
          message: 'Groq AI request timed out.',
          code: ERROR_CODES.AI_PROVIDER_TIMEOUT,
          details: {
            provider: 'groq',
            reason: 'timeout'
          }
        });
      }

      logger.error('Groq provider request failed', {
        provider: 'groq',
        errorName: error.name
      });

      throw new ApiError({
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Unable to communicate with Groq AI.',
        code: ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
        details: {
          provider: 'groq',
          reason: 'network_error'
        }
      });

    } finally {
      clearTimeout(timeout);
    }
  };

  return Object.freeze({
    name: 'groq',
    generateChatCompletion
  });
};

const groqSettings = getProviderConfig('groq');

export const groqProvider = createGroqProvider({
  apiKey: groqSettings.apiKey,
  model: groqSettings.model
});
