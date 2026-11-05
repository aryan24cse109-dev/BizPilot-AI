
import { z } from 'zod';

import { env } from '../../config/env.js';
import { getProviderConfig } from '../../config/provider.config.js';

import { SARVAM_CONFIG } from './sarvam.config.js';

import { ApiError } from '../../utils/ApiError.js';

import {
  HTTP_STATUS,
  ERROR_CODES
} from '../../utils/constants.js';

import { logger } from '../../utils/logger.js';

// Validate individual messages.
const messageSchema = z.object({
  role: z.enum(SARVAM_CONFIG.supportedRoles),
  content: z.string().min(1).max(100000)
}).strict();

// Validate chat completion input.
const completionSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),

  model: z.string().min(1).optional(),

  temperature: z.number().min(0).max(2).optional(),

  maxTokens: z.number().int().min(1).max(8192).optional()
}).strict();

// Normalize and validate the Sarvam response.
const normalizeResponse = (response, requestedModel) => {
  const choice = response?.choices?.[0];

  const content = choice?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError({
      statusCode: HTTP_STATUS.BAD_GATEWAY,
      message: 'Sarvam AI returned an invalid or empty response.',
      code: ERROR_CODES.AI_RESPONSE_INVALID,
      details: {
        provider: 'sarvam'
      }
    });
  }

  return {
    provider: 'sarvam',

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

// Parse upstream errors without exposing raw provider responses.
const parseProviderError = async (response) => {
  try {
    const body = await response.json();

    return {
      providerStatus: response.status,
      providerMessage:
        body?.error?.message ??
        body?.message ??
        'Sarvam API request failed.'
    };
  } catch {
    return {
      providerStatus: response.status,
      providerMessage: 'Sarvam API request failed.'
    };
  }
};

// Create a Sarvam provider instance.
export const createSarvamProvider = ({
  apiKey,
  model = SARVAM_CONFIG.defaultModel,
  baseUrl = SARVAM_CONFIG.baseUrl,
  timeoutMs = env.AI_REQUEST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
} = {}) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A valid fetch implementation is required.');
  }

  const generateChatCompletion = async (input) => {
    // Validate input.
    const parsedInput = completionSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new ApiError({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Invalid Sarvam chat completion request.',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: parsedInput.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    // Check provider API key.
    if (!apiKey) {
      throw new ApiError({
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Sarvam API key is not configured.',
        code: ERROR_CODES.AI_PROVIDER_UNAVAILABLE
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
      SARVAM_CONFIG.chatCompletionsPath,
      baseUrl
    );

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      // Send request to Sarvam.
      const response = await fetchImpl(url, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey
        },

        body: JSON.stringify({
          model: selectedModel,
          messages,

          temperature:
            temperature ?? SARVAM_CONFIG.defaultTemperature,

          max_tokens:
            maxTokens ?? SARVAM_CONFIG.defaultMaxTokens
        }),

        signal: controller.signal
      });

      // Handle upstream HTTP errors.
      if (!response.ok) {
        const providerError = await parseProviderError(response);

        logger.warn('Sarvam API returned an error', {
          provider: 'sarvam',
          providerStatus: response.status
        });

        const statusCode =
          response.status === 429 || response.status >= 500
            ? HTTP_STATUS.SERVICE_UNAVAILABLE
            : HTTP_STATUS.BAD_GATEWAY;

        throw new ApiError({
          statusCode,
          message: 'Sarvam AI request failed.',
          code: ERROR_CODES.AI_PROVIDER_ERROR,
          details: {
            provider: 'sarvam',
            providerStatus: providerError.providerStatus
          }
        });
      }

      // Parse successful response.
      const responseData = await response.json();

      return normalizeResponse(responseData, selectedModel);

    } catch (error) {
      // Preserve application-level errors.
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle timeout.
      if (controller.signal.aborted) {
        throw new ApiError({
          statusCode: HTTP_STATUS.GATEWAY_TIMEOUT,
          message: 'Sarvam AI request timed out.',
          code: ERROR_CODES.AI_PROVIDER_TIMEOUT
        });
      }

      // Log sanitized error information.
      logger.error('Sarvam provider request failed', {
        provider: 'sarvam',
        errorName: error.name
      });

      // Handle network or unexpected provider errors.
      throw new ApiError({
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Unable to communicate with Sarvam AI.',
        code: ERROR_CODES.AI_PROVIDER_UNAVAILABLE
      });

    } finally {
      clearTimeout(timeout);
    }
  };

  return Object.freeze({
    name: 'sarvam',
    generateChatCompletion
  });
};

// Initialize the configured Sarvam provider.
const sarvamSettings = getProviderConfig('sarvam');

export const sarvamProvider = createSarvamProvider({
  apiKey: sarvamSettings.apiKey,
  model: sarvamSettings.model
});
