
import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeAssistantRequest } from '../../../../src/modules/assistant/analyzers/request.analyzer.js';

test('analyzes an English invoice request', () => {
  const result = analyzeAssistantRequest({
    message: 'Create an invoice for Rahul'
  });

  assert.equal(result.language, 'english');
  assert.equal(result.intent, 'CREATE_INVOICE_DRAFT');
  assert.equal(result.intentSource, 'current_message');
  assert.equal(result.needsClarification, false);
});

test('analyzes a Hindi request', () => {
  const result = analyzeAssistantRequest({
    message: 'मुझे पेमेंट की जानकारी बताओ'
  });

  assert.equal(result.language, 'hindi');
});

test('analyzes a Hinglish request', () => {
  const result = analyzeAssistantRequest({
    message: 'Bhai invoice bana do'
  });

  assert.equal(result.language, 'hinglish');
  assert.equal(result.intent, 'CREATE_INVOICE_DRAFT');
});

test('uses previous user intent for a follow-up', () => {
  const result = analyzeAssistantRequest({
    message: 'Aur Rahul ke liye?',
    history: [
      {
        role: 'user',
        content: 'Create an invoice for Amit'
      },
      {
        role: 'assistant',
        content: 'What amount should I use?'
      }
    ]
  });

  assert.equal(result.intent, 'CREATE_INVOICE_DRAFT');
  assert.equal(result.intentSource, 'conversation_context');
  assert.equal(result.isFollowUp, true);
});

test('does not reuse previous intent for an unrelated new request', () => {
  const result = analyzeAssistantRequest({
    message: 'Hello, how are you?',
    history: [
      {
        role: 'user',
        content: 'Create an invoice for Amit'
      }
    ]
  });

  assert.equal(result.intent, null);
  assert.equal(result.intentSource, 'none');
  assert.equal(result.needsClarification, true);
});

test('requests clarification for an unrecognized request', () => {
  const result = analyzeAssistantRequest({
    message: 'Can you help me?'
  });

  assert.equal(result.intent, null);
  assert.equal(result.needsClarification, true);
});

test('does not use assistant message as previous user intent', () => {
  const result = analyzeAssistantRequest({
    message: 'And for Rahul?',
    history: [
      {
        role: 'assistant',
        content: 'Create an invoice for Amit'
      }
    ]
  });

  assert.equal(result.intent, null);
  assert.equal(result.needsClarification, true);
});

test('handles empty input safely', () => {
  const result = analyzeAssistantRequest({});

  assert.equal(result.language, 'unknown');
  assert.equal(result.intent, null);
  assert.equal(result.needsClarification, true);
});

test('uses the most recent user message for follow-up context', () => {
  const result = analyzeAssistantRequest({
    message: 'What about this one?',
    history: [
      {
        role: 'user',
        content: 'Create an invoice for Amit'
      },
      {
        role: 'assistant',
        content: 'Sure.'
      },
      {
        role: 'user',
        content: 'Show my payment history'
      },
      {
        role: 'assistant',
        content: 'Here is your payment history.'
      }
    ]
  });

  assert.equal(result.intent, 'GET_PAYMENT_HISTORY');
  assert.equal(result.intentSource, 'conversation_context');
});
