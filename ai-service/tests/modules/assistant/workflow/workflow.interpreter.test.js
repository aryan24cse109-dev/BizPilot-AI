
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  interpretWorkflow,
  WorkflowInterpretationError
} from '../../../../src/modules/assistant/workflow/workflow.interpreter.js';

const createResponse = ({
  action = 'GET_INVOICE',
  parameters = {},
  entities = {},
  requiresConfirmation = false
} = {}) => ({
  type: 'workflow',
  intent: action,
  confidence: 0.95,
  entities,
  workflow: {
    action,
    parameters,
    requiresConfirmation
  },
  clarificationQuestion: null,
  response: 'I can help with that.'
});

test('keeps a complete GET_INVOICE workflow', () => {
  const result = interpretWorkflow(createResponse({
    action: 'GET_INVOICE',
    parameters: {
      clientName: 'Rahul'
    }
  }));

  assert.equal(result.response.type, 'workflow');
  assert.equal(result.interpretation.isComplete, true);
  assert.equal(result.response.workflow.parameters.clientName, 'Rahul');
});

test('allows GET_INVOICE without optional filters', () => {
  const result = interpretWorkflow(createResponse());

  assert.equal(result.response.type, 'workflow');
  assert.equal(result.interpretation.isComplete, true);
});

test('asks for an invoice identifier for GET_INVOICE_STATUS', () => {
  const result = interpretWorkflow(createResponse({
    action: 'GET_INVOICE_STATUS'
  }));

  assert.equal(result.response.type, 'clarification');
  assert.equal(result.response.workflow, null);
  assert.equal(result.interpretation.isComplete, false);
  assert.match(result.response.clarificationQuestion, /invoice/i);
});

test('uses entity values to complete workflow parameters', () => {
  const result = interpretWorkflow(createResponse({
    action: 'GET_INVOICE_STATUS',
    entities: {
      invoiceNumber: 'INV-100'
    }
  }));

  assert.equal(result.response.type, 'workflow');
  assert.equal(
    result.response.workflow.parameters.invoiceNumber,
    'INV-100'
  );
});

test('explicit workflow parameters take precedence over entities', () => {
  const result = interpretWorkflow(createResponse({
    entities: {
      clientName: 'Rahul'
    },
    parameters: {
      clientName: 'Amit'
    }
  }));

  assert.equal(
    result.response.workflow.parameters.clientName,
    'Amit'
  );
});

test('asks for client details when creating an invoice draft', () => {
  const result = interpretWorkflow(createResponse({
    action: 'CREATE_INVOICE_DRAFT',
    parameters: {
      amount: 5000
    }
  }));

  assert.equal(result.response.type, 'clarification');
  assert.equal(result.response.workflow, null);
  assert.equal(result.interpretation.isComplete, false);
  assert.match(result.response.clarificationQuestion, /client/i);
});

test('asks for invoice information before sending an invoice', () => {
  const result = interpretWorkflow(createResponse({
    action: 'SEND_INVOICE'
  }));

  assert.equal(result.response.type, 'clarification');
  assert.equal(result.response.workflow, null);
  assert.equal(result.interpretation.requiresConfirmation, true);
});

test('requires confirmation for a complete SEND_INVOICE workflow', () => {
  const result = interpretWorkflow(createResponse({
    action: 'SEND_INVOICE',
    parameters: {
      invoiceNumber: 'INV-100'
    }
  }));

  assert.equal(result.response.type, 'workflow');
  assert.equal(result.response.workflow.requiresConfirmation, true);
  assert.equal(result.interpretation.requiresConfirmation, true);
});

test('requires confirmation for a complete CANCEL_INVOICE workflow', () => {
  const result = interpretWorkflow(createResponse({
    action: 'CANCEL_INVOICE',
    parameters: {
      invoiceId: 'invoice-123'
    }
  }));

  assert.equal(result.response.workflow.requiresConfirmation, true);
});

test('does not require confirmation for read-only actions', () => {
  const result = interpretWorkflow(createResponse({
    action: 'GET_DASHBOARD_SUMMARY'
  }));

  assert.equal(result.response.workflow.requiresConfirmation, false);
});

test('does not alter non-workflow responses', () => {
  const response = {
    type: 'conversation',
    intent: null,
    confidence: 0.99,
    entities: {},
    workflow: null,
    clarificationQuestion: null,
    response: 'Hello!'
  };

  const result = interpretWorkflow(response);

  assert.equal(result.response, response);
  assert.equal(result.interpretation.isWorkflow, false);
});

test('rejects an unsupported workflow action', () => {
  const response = createResponse({
    action: 'UNSUPPORTED_ACTION'
  });

  assert.throws(
    () => interpretWorkflow(response),
    WorkflowInterpretationError
  );
});
