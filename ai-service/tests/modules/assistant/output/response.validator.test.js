
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateAndNormalizeAssistantOutput,
  AssistantOutputValidationError
} from '../../../../src/modules/assistant/output/response.validator.js';

const createValidConversationResponse = () => ({
  type: 'conversation',
  intent: null,
  confidence: 0.95,
  entities: {
    invoiceId: null,
    invoiceNumber: null,
    clientName: null,
    clientEmail: null,
    status: null,
    amount: null,
    currency: null,
    dueDate: null,
    message: null,
    notes: null
  },
  workflow: null,
  clarificationQuestion: null,
  response: 'Hello! How can I help you?'
});

const createValidWorkflowResponse = () => ({
  type: 'workflow',
  intent: 'CREATE_INVOICE_DRAFT',
  confidence: 0.95,
  entities: {
    invoiceId: null,
    invoiceNumber: null,
    clientName: 'Rahul',
    clientEmail: null,
    status: null,
    amount: null,
    currency: null,
    dueDate: null,
    message: null,
    notes: null
  },
  workflow: {
    action: 'CREATE_INVOICE_DRAFT',
    parameters: {
      clientName: 'Rahul'
    },
    requiresConfirmation: false
  },
  clarificationQuestion: null,
  response: 'I can prepare an invoice draft for Rahul.'
});

test('accepts a valid conversation response', () => {
  const result = validateAndNormalizeAssistantOutput(
    createValidConversationResponse()
  );

  assert.equal(result.type, 'conversation');
  assert.equal(result.workflow, null);
});

test('accepts a valid workflow response', () => {
  const result = validateAndNormalizeAssistantOutput(
    createValidWorkflowResponse()
  );

  assert.equal(result.type, 'workflow');
  assert.equal(result.workflow.action, 'CREATE_INVOICE_DRAFT');
});

test('rejects an invalid response schema', () => {
  assert.throws(
    () => validateAndNormalizeAssistantOutput({
      type: 'invalid',
      confidence: 'high'
    }),
    AssistantOutputValidationError
  );
});

test('rejects a workflow response without workflow details', () => {
  const response = createValidWorkflowResponse();
  response.workflow = null;

  assert.throws(
    () => validateAndNormalizeAssistantOutput(response),
    AssistantOutputValidationError
  );
});

test('rejects an intent and workflow action mismatch', () => {
  const response = createValidWorkflowResponse();
  response.intent = 'SEND_INVOICE';

  assert.throws(
    () => validateAndNormalizeAssistantOutput(response),
    AssistantOutputValidationError
  );
});

test('overwrites model confirmation flag using server policy', () => {
  const response = createValidWorkflowResponse();

  response.intent = 'SEND_INVOICE';
  response.workflow.action = 'SEND_INVOICE';
  response.workflow.requiresConfirmation = false;

  const result = validateAndNormalizeAssistantOutput(response);

  assert.equal(result.workflow.requiresConfirmation, true);
});

test('does not allow a non-workflow response to carry workflow data', () => {
  const response = createValidConversationResponse();

  response.workflow = {
    action: 'CREATE_INVOICE_DRAFT',
    parameters: {},
    requiresConfirmation: false
  };

  assert.throws(
    () => validateAndNormalizeAssistantOutput(response),
    AssistantOutputValidationError
  );
});

test('clears clarification question from a conversation response', () => {
  const response = createValidConversationResponse();
  response.clarificationQuestion = 'Which invoice?';

  const result = validateAndNormalizeAssistantOutput(response);

  assert.equal(result.clarificationQuestion, null);
});
