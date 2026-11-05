
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAssistantService
} from '../../src/services/assistant.service.js';

const validWorkflowResponse = {
  type: 'workflow',
  intent: 'GET_INVOICE',
  confidence: 0.95,
  entities: {
    clientName: 'Rahul',
    status: 'PENDING'
  },
  workflow: {
    action: 'GET_INVOICE',
    parameters: {
      clientName: 'Rahul',
      status: 'PENDING'
    },
    requiresConfirmation: false
  },
  clarificationQuestion: null,
  response: 'I can look up Rahul’s pending invoices.'
};

const createMockAIService = (content) => ({
  generateChatCompletion: async () => ({
    provider: 'sarvam',
    model: 'sarvam-105b',
    content,
    finishReason: 'stop',
    usage: null,
    requestId: 'test-request'
  })
});

const silentLogger = {
  info() {},
  warn() {},
  error() {}
};

test('interprets a valid workflow request', async () => {
  const service = createAssistantService({
    aiServiceImpl: createMockAIService(
      JSON.stringify(validWorkflowResponse)
    ),
    loggerImpl: silentLogger
  });

  const result = await service.interpretMessage({
    message: 'Show pending invoices for Rahul'
  });

  assert.equal(result.type, 'workflow');
  assert.equal(result.intent, 'GET_INVOICE');
  assert.equal(result.provider, 'sarvam');
  assert.equal(result.workflow.action, 'GET_INVOICE');
});

test('forces confirmation for SEND_INVOICE', async () => {
  const response = {
    ...validWorkflowResponse,
    intent: 'SEND_INVOICE',
    workflow: {
      action: 'SEND_INVOICE',
      parameters: {
  invoiceNumber: 'INV-100'
},
      requiresConfirmation: false
    }
  };

  const service = createAssistantService({
    aiServiceImpl: createMockAIService(JSON.stringify(response)),
    loggerImpl: silentLogger
  });

  const result = await service.interpretMessage({
    message: 'Send the invoice'
  });

  assert.equal(result.workflow.requiresConfirmation, true);
});

test('forces confirmation for CANCEL_INVOICE', async () => {
  const response = {
    ...validWorkflowResponse,
    intent: 'CANCEL_INVOICE',
    workflow: {
      action: 'CANCEL_INVOICE',
      parameters: {
  invoiceId: 'invoice-123'
},
      requiresConfirmation: false
    }
  };

  const service = createAssistantService({
    aiServiceImpl: createMockAIService(JSON.stringify(response)),
    loggerImpl: silentLogger
  });

  const result = await service.interpretMessage({
    message: 'Cancel this invoice'
  });

  assert.equal(result.workflow.requiresConfirmation, true);
});

test('converts low-confidence responses into clarification', async () => {
  const response = {
    type: 'workflow',
    intent: 'GET_INVOICE',
    confidence: 0.4,
    entities: {},
    workflow: {
      action: 'GET_INVOICE',
      parameters: {},
      requiresConfirmation: false
    },
    clarificationQuestion: null,
    response: 'I need more information.'
  };

  const service = createAssistantService({
    aiServiceImpl: createMockAIService(JSON.stringify(response)),
    loggerImpl: silentLogger
  });

  const result = await service.interpretMessage({
    message: 'Show that thing'
  });

  assert.equal(result.type, 'clarification');
  assert.equal(result.workflow, null);
  assert.ok(result.clarificationQuestion);
});

test('rejects a malformed AI JSON response', async () => {
  const service = createAssistantService({
    aiServiceImpl: createMockAIService('This is not JSON'),
    loggerImpl: silentLogger
  });

  await assert.rejects(
    () => service.interpretMessage({
      message: 'Show my invoices'
    }),
    (error) => error.code === 'AI_RESPONSE_PARSE_ERROR'
  );
});

test('rejects an AI response with an unsupported action', async () => {
  const response = {
    ...validWorkflowResponse,
    intent: 'DELETE_ALL_DATA',
    workflow: {
      action: 'DELETE_ALL_DATA',
      parameters: {},
      requiresConfirmation: false
    }
  };

  const service = createAssistantService({
    aiServiceImpl: createMockAIService(JSON.stringify(response)),
    loggerImpl: silentLogger
  });

  await assert.rejects(
    () => service.interpretMessage({
      message: 'Delete everything'
    }),
    (error) => error.code === 'AI_RESPONSE_INVALID'
  );
});

test('rejects an empty user message before calling the AI provider', async () => {
  let providerCalled = false;

  const mockAIService = {
    generateChatCompletion: async () => {
      providerCalled = true;
      throw new Error('Provider should not be called');
    }
  };

  const service = createAssistantService({
    aiServiceImpl: mockAIService,
    loggerImpl: silentLogger
  });

  await assert.rejects(
    () => service.interpretMessage({
      message: '   '
    }),
    (error) => error.code === 'VALIDATION_ERROR'
  );

  assert.equal(providerCalled, false);
});
