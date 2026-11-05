
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGroqProvider
} from '../../src/providers/groq/groq.provider.js';

const validInput = {
  messages: [
    {
      role: 'user',
      content: 'Reply with hello.'
    }
  ],
  temperature: 0,
  maxTokens: 100
};

const successResponse = () =>
  new Response(JSON.stringify({
    id: 'groq-test-123',
    model: 'llama-3.3-70b-versatile',
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Hello!'
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });

test('Groq sends a valid chat completion request', async () => {
  let capturedRequest;

  const provider = createGroqProvider({
    apiKey: 'test-groq-key',
    fetchImpl: async (url, options) => {
      capturedRequest = { url, options };
      return successResponse();
    }
  });

  const result = await provider.generateChatCompletion(validInput);

  assert.equal(result.provider, 'groq');
  assert.equal(result.content, 'Hello!');
  assert.equal(result.model, 'llama-3.3-70b-versatile');
  assert.equal(result.usage.totalTokens, 15);

  assert.equal(
    capturedRequest.url.toString(),
    'https://api.groq.com/openai/v1/chat/completions'
  );

  assert.equal(
    capturedRequest.options.headers.Authorization,
    'Bearer test-groq-key'
  );

  const body = JSON.parse(capturedRequest.options.body);

  assert.equal(body.model, 'llama-3.3-70b-versatile');
  assert.equal(body.max_completion_tokens, 100);
});

test('Groq rejects invalid input', async () => {
  const provider = createGroqProvider({
    apiKey: 'test-groq-key',
    fetchImpl: async () => successResponse()
  });

  await assert.rejects(
    provider.generateChatCompletion({
      messages: []
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      return true;
    }
  );
});

test('Groq rejects requests without an API key', async () => {
  const provider = createGroqProvider({
    apiKey: undefined,
    fetchImpl: async () => successResponse()
  });

  await assert.rejects(
    provider.generateChatCompletion(validInput),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.details.reason, 'missing_api_key');
      return true;
    }
  );
});

test('Groq handles upstream authentication errors', async () => {
  const provider = createGroqProvider({
    apiKey: 'test-groq-key',
    fetchImpl: async () => new Response(
      JSON.stringify({ error: { message: 'Invalid key' } }),
      { status: 401 }
    )
  });

  await assert.rejects(
    provider.generateChatCompletion(validInput),
    (error) => {
      assert.equal(error.statusCode, 502);
      assert.equal(error.code, 'AI_PROVIDER_ERROR');
      assert.equal(error.details.providerStatus, 401);
      return true;
    }
  );
});

test('Groq handles rate limits', async () => {
  const provider = createGroqProvider({
    apiKey: 'test-groq-key',
    fetchImpl: async () => new Response(
      JSON.stringify({ error: { message: 'Rate limited' } }),
      { status: 429 }
    )
  });

  await assert.rejects(
    provider.generateChatCompletion(validInput),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.details.providerStatus, 429);
      return true;
    }
  );
});

test('Groq handles network errors', async () => {
  const provider = createGroqProvider({
    apiKey: 'test-groq-key',
    fetchImpl: async () => {
      throw new TypeError('Network unavailable');
    }
  });

  await assert.rejects(
    provider.generateChatCompletion(validInput),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.details.reason, 'network_error');
      return true;
    }
  );
});

test('Groq handles request timeout', async () => {
  const provider = createGroqProvider({
    apiKey: 'test-groq-key',
    timeoutMs: 20,
    fetchImpl: async (_url, options) => {
      await new Promise((resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => reject(new Error('Aborted')),
          { once: true }
        );
      });
    }
  });

  await assert.rejects(
    provider.generateChatCompletion(validInput),
    (error) => {
      assert.equal(error.statusCode, 504);
      assert.equal(error.code, 'AI_PROVIDER_TIMEOUT');
      return true;
    }
  );
});

test('Groq rejects empty model responses', async () => {
  const provider = createGroqProvider({
    apiKey: 'test-groq-key',
    fetchImpl: async () => new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: ''
            }
          }
        ]
      }),
      { status: 200 }
    )
  });

  await assert.rejects(
    provider.generateChatCompletion(validInput),
    (error) => {
      assert.equal(error.statusCode, 502);
      assert.equal(error.code, 'AI_RESPONSE_INVALID');
      return true;
    }
  );
});
