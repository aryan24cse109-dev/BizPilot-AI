
import test from 'node:test';
import assert from 'node:assert/strict';

import { detectIntent } from '../../../../src/modules/assistant/analyzers/intent.detector.js';

test('detects invoice creation intent', () => {
  assert.equal(
    detectIntent('Create an invoice for Rahul').intent,
    'CREATE_INVOICE_DRAFT'
  );
});

test('detects invoice status intent', () => {
  assert.equal(
    detectIntent('Check invoice payment status').intent,
    'GET_INVOICE_STATUS'
  );
});

test('detects invoice details intent', () => {
  assert.equal(
    detectIntent('Show invoice details').intent,
    'GET_INVOICE'
  );
});

test('detects payment history intent', () => {
  assert.equal(
    detectIntent('Show my payment history').intent,
    'GET_PAYMENT_HISTORY'
  );
});

test('detects outstanding balance intent', () => {
  assert.equal(
    detectIntent('How much outstanding balance is remaining?').intent,
    'GET_OUTSTANDING_BALANCE'
  );
});

test('detects dashboard summary intent', () => {
  assert.equal(
    detectIntent('Show my business dashboard summary').intent,
    'GET_DASHBOARD_SUMMARY'
  );
});

test('detects payment follow-up intent', () => {
  assert.equal(
    detectIntent('Prepare a payment reminder for my client').intent,
    'PREPARE_PAYMENT_FOLLOWUP'
  );
});

test('detects client message intent', () => {
  assert.equal(
    detectIntent('Write a message for my client').intent,
    'PREPARE_CLIENT_MESSAGE'
  );
});

test('detects invoice sending intent', () => {
  assert.equal(
    detectIntent('Send the invoice to Rahul').intent,
    'SEND_INVOICE'
  );
});

test('detects invoice cancellation intent', () => {
  assert.equal(
    detectIntent('Cancel this invoice').intent,
    'CANCEL_INVOICE'
  );
});

test('detects Hinglish invoice creation', () => {
  assert.equal(
    detectIntent('Rahul ke liye invoice banao').intent,
    'CREATE_INVOICE_DRAFT'
  );
});

test('detects Hindi invoice creation', () => {
  assert.equal(
    detectIntent('इनवॉइस बनाओ').intent,
    'CREATE_INVOICE_DRAFT'
  );
});

test('returns null for an unrelated message', () => {
  assert.equal(
    detectIntent('Hello, how are you?').intent,
    null
  );
});

test('returns null for empty input', () => {
  assert.equal(detectIntent('').intent, null);
});
