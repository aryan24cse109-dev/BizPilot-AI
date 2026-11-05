
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyConfidencePolicy,
  LOW_CONFIDENCE_THRESHOLD
} from '../../../../src/modules/assistant/output/confidence.handler.js';

const createResponse = (confidence) => ({
  type: 'workflow',
  intent: 'CREATE_INVOICE_DRAFT',
  confidence,
  workflow: {
    action: 'CREATE_INVOICE_DRAFT',
    parameters: {},
    requiresConfirmation: false
  },
  clarificationQuestion: null,
  response: 'Preparing your invoice.'
});

test('uses the expected confidence threshold', () => {
  assert.equal(LOW_CONFIDENCE_THRESHOLD, 0.65);
});

test('preserves a high-confidence response', () => {
  const response = createResponse(0.95);

  const result = applyConfidencePolicy(response);

  assert.equal(result.type, 'workflow');
  assert.equal(result.workflow.action, 'CREATE_INVOICE_DRAFT');
});

test('preserves a response exactly at the threshold', () => {
  const response = createResponse(0.65);

  const result = applyConfidencePolicy(response);

  assert.equal(result.type, 'workflow');
});

test('converts a low-confidence workflow into clarification', () => {
  const result = applyConfidencePolicy(createResponse(0.40));

  assert.equal(result.type, 'clarification');
  assert.equal(result.workflow, null);
  assert.ok(result.clarificationQuestion);
});

test('uses a default clarification question when missing', () => {
  const response = {
    ...createResponse(0.30),
    clarificationQuestion: null
  };

  const result = applyConfidencePolicy(response);

  assert.equal(
    result.clarificationQuestion,
    'Could you provide a little more detail so I can understand your request?'
  );
});

test('preserves an existing clarification question', () => {
  const response = {
    ...createResponse(0.30),
    clarificationQuestion: 'Which invoice do you mean?'
  };

  const result = applyConfidencePolicy(response);

  assert.equal(
    result.clarificationQuestion,
    'Which invoice do you mean?'
  );
});

test('rejects invalid confidence values', () => {
  assert.throws(
    () => applyConfidencePolicy(createResponse(1.5)),
    TypeError
  );

  assert.throws(
    () => applyConfidencePolicy(createResponse(-0.1)),
    TypeError
  );

  assert.throws(
    () => applyConfidencePolicy(createResponse(Number.NaN)),
    TypeError
  );
});
