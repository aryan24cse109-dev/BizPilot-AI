
import { sarvamProvider } from '../providers/sarvam/sarvam.provider.js';
import { groqProvider } from '../providers/groq/groq.provider.js';
import { getProviderConfig } from '../config/provider.config.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const isFallbackEligible = (error) => {
  if (!error) return false;

  // Never fallback for missing primary credentials.
  if (error.details?.reason === 'missing_api_key') {
    return false;
  }

  // Timeout errors are eligible.
  if (
    error.code === ERROR_CODES.AI_PROVIDER_TIMEOUT ||
    error.statusCode === HTTP_STATUS.GATEWAY_TIMEOUT
  ) {
    return true;
  }

  // Network failures are eligible.
  if (
    error.code === ERROR_CODES.AI_PROVIDER_UNAVAILABLE &&
    error.details?.reason === 'network_error'
  ) {
    return true;
  }

  // Rate limits and upstream server errors are eligible.
  const providerStatus = error.details?.providerStatus;

  if (
    error.code === ERROR_CODES.AI_PROVIDER_ERROR &&
    (providerStatus === 429 || providerStatus >= 500)
  ) {
    return true;
  }

  return false;
};

export const createAIService = ({
  primaryProvider = sarvamProvider,
  fallbackProvider = groqProvider,
  loggerImpl = logger,
  isFallbackConfigured = (providerName) =>
    getProviderConfig(providerName).enabled
} = {}) => {
  const generateChatCompletion = async (input) => {
    try {
      const primaryResult =
        await primaryProvider.generateChatCompletion(input);

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
          fallbackProvider: fallbackProvider.name
        });

        throw primaryError;
      }

      loggerImpl.warn('Primary AI provider failed; trying fallback', {
        primaryProvider: primaryProvider.name,
        fallbackProvider: fallbackProvider.name,
        errorCode: primaryError.code
      });

      try {
        const fallbackResult =
          await fallbackProvider.generateChatCompletion(input);

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
          primaryErrorCode: primaryError.code,
          fallbackErrorCode: fallbackError.code
        });

        throw new ApiError({
          statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
          message: 'All configured AI providers are currently unavailable.',
          code: ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
          details: {
            primaryProvider: primaryProvider.name,
            fallbackProvider: fallbackProvider.name,
            fallbackFailed: true
          }
        });
      }
    }
  };

  return Object.freeze({
    generateChatCompletion
  });
};

export const aiService = createAIService();
