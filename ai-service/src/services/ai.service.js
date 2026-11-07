
import { sarvamProvider } from '../providers/sarvam/sarvam.provider.js';
import { groqProvider } from '../providers/groq/groq.provider.js';
import { getProviderConfig } from '../config/provider.config.js';

import { ApiError } from '../utils/ApiError.js';

import {
  HTTP_STATUS,
  ERROR_CODES
} from '../utils/constants.js';

import { logger } from '../utils/logger.js';

const isInvalidStructuredResponse = (error) =>
  error?.code === ERROR_CODES.AI_RESPONSE_INVALID ||
  error?.code === ERROR_CODES.AI_RESPONSE_PARSE_ERROR;

const summarizeFailure = (error) => ({
  code: error?.code ?? null,
  statusCode: error?.statusCode ?? null,
  providerStatus: error?.details?.providerStatus ?? null,
  providerCategory: error?.details?.providerCategory ?? null,
  stage: error?.details?.stage ?? null,
  requestId: error?.details?.requestId ?? null
});

const isFallbackEligible = (error) => {
  if (!error) return false;

  // Do not fallback for missing primary credentials.
  if (error.details?.reason === 'missing_api_key') {
    return false;
  }

  // Invalid structured model output can use the fallback provider.
  if (isInvalidStructuredResponse(error)) {
    return true;
  }

  // Provider timeouts.
  if (
    error.code === ERROR_CODES.AI_PROVIDER_TIMEOUT ||
    error.statusCode === HTTP_STATUS.GATEWAY_TIMEOUT
  ) {
    return true;
  }

  // Network failures.
  if (
    error.code === ERROR_CODES.AI_PROVIDER_UNAVAILABLE &&
    error.details?.reason === 'network_error'
  ) {
    return true;
  }

  // Rate limits and upstream server errors.
  const providerStatus = error.details?.providerStatus;

  if (
    error.code === ERROR_CODES.AI_PROVIDER_ERROR &&
    (
      providerStatus === 429 ||
      (providerStatus >= 500 && providerStatus <= 599)
    )
  ) {
    return true;
  }

  return false;
};

const createCombinedFailure = (primaryError, fallbackError) => {
  // If a provider returned invalid structured output, preserve
  // that diagnosis rather than hiding it as a generic outage.
  if (
    isInvalidStructuredResponse(primaryError) ||
    isInvalidStructuredResponse(fallbackError)
  ) {
    return new ApiError({
      statusCode: HTTP_STATUS.BAD_GATEWAY,
      message: 'AI providers could not produce a valid assistant response.',
      code: ERROR_CODES.AI_RESPONSE_INVALID,
      details: {
        primaryProviderFailed: true,
        fallbackProviderFailed: true,
        primaryFailure: summarizeFailure(primaryError),
        fallbackFailure: summarizeFailure(fallbackError)
      }
    });
  }

  return new ApiError({
    statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
    message: 'All configured AI providers are currently unavailable.',
    code: ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
    details: {
      primaryProviderFailed: true,
      fallbackProviderFailed: true,
      primaryFailure: summarizeFailure(primaryError),
      fallbackFailure: summarizeFailure(fallbackError)
    }
  });
};

export const createAIService = ({
  primaryProvider = sarvamProvider,
  fallbackProvider = groqProvider,
  loggerImpl = logger,
  isFallbackConfigured = (providerName) =>
    getProviderConfig(providerName).enabled
} = {}) => {
  const generateChatCompletion = async (
    input,
    { validateResponse } = {}
  ) => {
    const attemptProvider = async (provider) => {
      const result = await provider.generateChatCompletion(input);

      // Validate the complete assistant response before accepting
      // the provider result as successful.
      const validatedResponse = validateResponse
        ? validateResponse(result)
        : undefined;

      return {
        ...result,
        validatedResponse
      };
    };

    try {
      const primaryResult = await attemptProvider(primaryProvider);

      loggerImpl.info('Primary AI provider completed request', {
        provider: primaryProvider.name
      });

      return primaryResult;
    } catch (primaryError) {
      if (!isFallbackEligible(primaryError)) {
        throw primaryError;
      }

      if (!isFallbackConfigured(fallbackProvider.name)) {
        loggerImpl.warn('AI fallback provider is not configured', {
          primaryProvider: primaryProvider.name,
          fallbackProvider: fallbackProvider.name,
          primaryErrorCode: primaryError.code ?? null
        });

        throw primaryError;
      }

      loggerImpl.warn('Primary AI provider failed; trying fallback', {
        primaryProvider: primaryProvider.name,
        fallbackProvider: fallbackProvider.name,
        errorCode: primaryError.code ?? null
      });

      try {
        const fallbackResult = await attemptProvider(fallbackProvider);

        loggerImpl.info('Fallback AI provider completed request', {
          provider: fallbackProvider.name,
          fallbackFrom: primaryProvider.name
        });

        return {
          ...fallbackResult,
          fallbackFrom: primaryProvider.name
        };
      } catch (fallbackError) {
        loggerImpl.error('Both AI providers failed', {
          primaryProvider: primaryProvider.name,
          fallbackProvider: fallbackProvider.name,
          primaryErrorCode: primaryError.code ?? null,
          fallbackErrorCode: fallbackError.code ?? null
        });

        throw createCombinedFailure(primaryError, fallbackError);
      }
    }
  };

  return Object.freeze({
    generateChatCompletion
  });
};

export const aiService = createAIService();
