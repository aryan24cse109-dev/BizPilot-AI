
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeWorkflowParameters,
  hasMeaningfulValue
} from '../../../../src/modules/assistant/workflow/workflow.normalizer.js';

test('normalizes whitespace in string parameters', () => {
  const result = normalizeWorkflowParameters({
    parameters: {
      clientName: '  Rahul  '
    }
  });

  assert.equal(result.clientName, 'Rahul');
});

test('merges entities with workflow parameters', () => {
  const result = normalizeWorkflowParameters({
    entities: {
      clientName: 'Rahul',
      invoiceNumber: 'INV-100'
    },
    parameters: {
      clientName: 'Amit'
    }
  });

  assert.equal(result.clientName, 'Amit');
  assert.equal(result.invoiceNumber, 'INV-100');
});

test('converts empty strings into null', () => {
  const result = normalizeWorkflowParameters({
    parameters: {
      clientName: '   '
    }
  });

  assert.equal(result.clientName, null);
});

test('normalizes nested object and array values', () => {
  const result = normalizeWorkflowParameters({
    parameters: {
      items: [
        { description: '  Website development  ' }
      ]
    }
  });

  assert.equal(
    result.items[0].description,
    'Website development'
  );
});

test('does not treat null as a meaningful value', () => {
  assert.equal(hasMeaningfulValue(null), false);
});

test('does not treat empty arrays as meaningful values', () => {
  assert.equal(hasMeaningfulValue([]), false);
});

test('treats non-empty arrays as meaningful values', () => {
  assert.equal(hasMeaningfulValue([{ description: 'Design' }]), true);
});

test('treats zero as a meaningful numeric value', () => {
  assert.equal(hasMeaningfulValue(0), true);
});

test('treats false as a meaningful boolean value', () => {
  assert.equal(hasMeaningfulValue(false), true);
});
