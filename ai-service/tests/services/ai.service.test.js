
import test from 'node:test';
import assert from 'node:assert/strict';

import { createAIService } from '../../src/services/ai.service.js';
import { ApiError } from '../../src/utils/ApiError.js';

const createLogger = () => ({
  info() {},
  warn() {},
  error() {}
});

const createProvider = (name, implementation) => ({
  name,
  generateChatCompletion: implementation
});

const input = {
  messages: [
    {
      role: 'user',
      content: 'Hello'
    }
  ]
};

const createError = ({
  statusCode = 503,
  code = 'AI_PROVIDER_TIMEOUT',
  details = {}
} = {}) => new ApiError({
  statusCode,
  message: 'Test provider error',
  code,
  details
});

test('AI service uses Sarvam when primary succeeds', async () => {
  let groqCalled = false;

  const sarvam = createProvider(
    'sarvam',
    async () => ({
      provider: 'sarvam',
      content: 'Sarvam response'
    })
  );

  const groq = createProvider('groq', async () => {
    groqCalled = true;
    return { content: 'Groq response' };
  });

  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => true,
    loggerImpl: createLogger()
  });

  const result = await service.generateChatCompletion(input);

  assert.equal(result.provider, 'sarvam');
  assert.equal(result.content, 'Sarvam response');
  assert.equal(groqCalled, false);
});

test('AI service falls back to Groq after Sarvam timeout', async () => {
  const sarvam = createProvider(
    'sarvam',
    async () => {
      throw createError({
        code: 'AI_PROVIDER_TIMEOUT',
        statusCode: 504,
        details: { provider: 'sarvam', reason: 'timeout' }
      });
    }
  );

  const groq = createProvider(
    'groq',
    async () => ({
      provider: 'groq',
      content: 'Groq fallback response'
    })
  );

  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => true,
    loggerImpl: createLogger()
  });

  const result = await service.generateChatCompletion(input);

  assert.equal(result.provider, 'groq');
  assert.equal(result.content, 'Groq fallback response');
  assert.equal(result.fallbackFrom, 'sarvam');
});

test('AI service falls back after a provider rate limit', async () => {
  const sarvam = createProvider(
    'sarvam',
    async () => {
      throw createError({
        code: 'AI_PROVIDER_ERROR',
        statusCode: 503,
        details: {
          provider: 'sarvam',
          providerStatus: 429
        }
      });
    }
  );

  const groq = createProvider(
    'groq',
    async () => ({
      provider: 'groq',
      content: 'Fallback response'
    })
  );

  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => true,
    loggerImpl: createLogger()
  });

  const result = await service.generateChatCompletion(input);

  assert.equal(result.provider, 'groq');
  assert.equal(result.fallbackFrom, 'sarvam');
});

test('AI service falls back when primary response validation fails', async () => {
  let validationCalls = 0;
  const sarvam = createProvider('sarvam', async () => ({
    provider: 'sarvam',
    content: 'invalid'
  }));
  const groq = createProvider('groq', async () => ({
    provider: 'groq',
    content: '{"valid":true}'
  }));
  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => true,
    loggerImpl: createLogger()
  });

  const result = await service.generateChatCompletion(input, {
    validateResponse: (providerResult) => {
      validationCalls += 1;

      if (providerResult.provider === 'sarvam') {
        throw new ApiError({
          statusCode: 502,
          message: 'Invalid structured response',
          code: 'AI_RESPONSE_INVALID',
          details: {
            provider: 'sarvam',
            stage: 'json_parse',
            requestId: 'sarvam-invalid'
          }
        });
      }

      return { accepted: true };
    }
  });

  assert.equal(result.provider, 'groq');
  assert.equal(result.fallbackFrom, 'sarvam');
  assert.equal(result.validatedResponse.accepted, true);
  assert.equal(validationCalls, 2);
});

test('AI service does not fallback for invalid requests', async () => {
  let groqCalled = false;

  const sarvam = createProvider('sarvam', async () => {
    throw createError({
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    });
  });

  const groq = createProvider('groq', async () => {
    groqCalled = true;
    return { content: 'Should not run' };
  });

  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => true,
    loggerImpl: createLogger()
  });

  await assert.rejects(
    service.generateChatCompletion(input),
    (error) => error.code === 'VALIDATION_ERROR'
  );

  assert.equal(groqCalled, false);
});

test('AI service does not fallback for missing primary API key', async () => {
  let groqCalled = false;

  const sarvam = createProvider('sarvam', async () => {
    throw createError({
      code: 'AI_PROVIDER_UNAVAILABLE',
      details: {
        provider: 'sarvam',
        reason: 'missing_api_key'
      }
    });
  });

  const groq = createProvider('groq', async () => {
    groqCalled = true;
    return { content: 'Should not run' };
  });

  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => true,
    loggerImpl: createLogger()
  });

  await assert.rejects(
    service.generateChatCompletion(input),
    (error) => error.details.reason === 'missing_api_key'
  );

  assert.equal(groqCalled, false);
});

test('AI service preserves primary error when Groq is not configured', async () => {
  const sarvam = createProvider('sarvam', async () => {
    throw createError({
      code: 'AI_PROVIDER_TIMEOUT',
      statusCode: 504
    });
  });

  const groq = createProvider('groq', async () => ({
    content: 'Should not run'
  }));

  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => false,
    loggerImpl: createLogger()
  });

  await assert.rejects(
    service.generateChatCompletion(input),
    (error) => error.code === 'AI_PROVIDER_TIMEOUT'
  );
});

test('AI service returns controlled error when both providers fail', async () => {
  const sarvam = createProvider('sarvam', async () => {
    throw createError({
      code: 'AI_PROVIDER_TIMEOUT',
      statusCode: 504
    });
  });

  const groq = createProvider('groq', async () => {
    throw createError({
      code: 'AI_PROVIDER_UNAVAILABLE',
      details: {
        provider: 'groq',
        reason: 'network_error'
      }
    });
  });

  const service = createAIService({
    primaryProvider: sarvam,
    fallbackProvider: groq,
    isFallbackConfigured: () => true,
    loggerImpl: createLogger()
  });

  await assert.rejects(
    service.generateChatCompletion(input),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.code, 'AI_PROVIDER_UNAVAILABLE');
      assert.equal(error.details.fallbackProviderFailed, true);
      assert.equal(error.details.primaryFailure.code, 'AI_PROVIDER_TIMEOUT');
      assert.equal(error.details.fallbackFailure.code, 'AI_PROVIDER_UNAVAILABLE');
      return true;
    }
  );
});
