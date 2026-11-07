import test from 'node:test';
import assert from 'node:assert/strict';

import { createSarvamProvider } from '../../src/providers/sarvam/sarvam.provider.js';

const createSuccessResponse = (content = 'Hello from Sarvam') => {
  return new Response(
    JSON.stringify({
      id: 'test-request-123',
      model: 'sarvam-105b',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content
          }
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};

test('Sarvam provider sends a valid chat completion request', async () => {
  let capturedUrl;
  let capturedOptions;

  const provider = createSarvamProvider({
    apiKey: 'test-api-key',

    fetchImpl: async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;

      return createSuccessResponse();
    }
  });

  const result = await provider.generateChatCompletion({
    messages: [
      {
        role: 'user',
        content: 'Hello'
      }
    ]
  });

  assert.equal(provider.name, 'sarvam');

  assert.equal(
    capturedUrl.href,
    'https://api.sarvam.ai/v1/chat/completions'
  );

  assert.equal(capturedOptions.method, 'POST');

  assert.equal(
    capturedOptions.headers['api-subscription-key'],
    'test-api-key'
  );

  const requestBody = JSON.parse(capturedOptions.body);

  assert.equal(requestBody.model, 'sarvam-105b');
  assert.equal(requestBody.messages[0].content, 'Hello');

  assert.equal(result.provider, 'sarvam');
  assert.equal(result.content, 'Hello from Sarvam');
  assert.equal(result.usage.totalTokens, 15);
});

test('Sarvam forwards JSON response format for structured responses', async () => {
  let capturedBody;
  const provider = createSarvamProvider({
    apiKey: 'test-api-key',
    fetchImpl: async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return createSuccessResponse();
    }
  });

  await provider.generateChatCompletion({
    messages: [{ role: 'user', content: 'Return JSON.' }],
    responseFormat: { type: 'json_object' }
  });

  assert.deepEqual(capturedBody.response_format, {
    type: 'json_object'
  });
});

test('Sarvam provider rejects invalid messages', async () => {
  const provider = createSarvamProvider({
    apiKey: 'test-api-key',
    fetchImpl: async () => {
      throw new Error('Fetch should not execute');
    }
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: []
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.statusCode, 400);

      return true;
    }
  );
});

test('Sarvam provider rejects requests without an API key', async () => {
  const provider = createSarvamProvider({
    apiKey: null,
    fetchImpl: async () => {
      throw new Error('Fetch should not execute');
    }
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    }),
    (error) => {
      assert.equal(error.code, 'AI_PROVIDER_UNAVAILABLE');
      assert.equal(error.statusCode, 503);

      return true;
    }
  );
});

test('Sarvam provider handles upstream HTTP errors', async () => {
  const provider = createSarvamProvider({
    apiKey: 'test-api-key',

    fetchImpl: async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Unauthorized'
          }
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    }),
    (error) => {
      assert.equal(error.code, 'AI_PROVIDER_ERROR');
      assert.equal(error.statusCode, 502);

      return true;
    }
  );
});

test('Sarvam provider handles provider rate limits', async () => {
  const provider = createSarvamProvider({
    apiKey: 'test-api-key',

    fetchImpl: async () => {
      return new Response(
        JSON.stringify({
          message: 'Rate limit exceeded'
        }),
        {
          status: 429
        }
      );
    }
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    }),
    (error) => {
      assert.equal(error.code, 'AI_PROVIDER_ERROR');
      assert.equal(error.statusCode, 503);

      return true;
    }
  );
});

test('Sarvam provider handles network errors', async () => {
  const provider = createSarvamProvider({
    apiKey: 'test-api-key',

    fetchImpl: async () => {
      throw new TypeError('Network unavailable');
    }
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    }),
    (error) => {
      assert.equal(error.code, 'AI_PROVIDER_UNAVAILABLE');
      assert.equal(error.statusCode, 503);

      return true;
    }
  );
});

test('Sarvam provider handles request timeout', async () => {
  const provider = createSarvamProvider({
    apiKey: 'test-api-key',
    timeoutMs: 20,

    fetchImpl: async (url, options) => {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => {
            reject(new DOMException('Aborted', 'AbortError'));
          },
          { once: true }
        );
      });
    }
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    }),
    (error) => {
      assert.equal(error.code, 'AI_PROVIDER_TIMEOUT');
      assert.equal(error.statusCode, 504);

      return true;
    }
  );
});

test('Sarvam provider rejects empty model responses', async () => {
  const provider = createSarvamProvider({
    apiKey: 'test-api-key',

    fetchImpl: async () => {
      return createSuccessResponse('   ');
    }
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    }),
    (error) => {
      assert.equal(error.code, 'AI_RESPONSE_INVALID');
      assert.equal(error.statusCode, 502);

      return true;
    }
  );
});