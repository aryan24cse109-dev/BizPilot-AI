
import test from 'node:test';
import assert from 'node:assert/strict';

import { detectLanguage } from '../../../../src/modules/assistant/analyzers/language.detector.js';

test('detects English', () => {
  assert.equal(
    detectLanguage('Create an invoice for Rahul').language,
    'english'
  );
});

test('detects Hindi written in Devanagari', () => {
  assert.equal(
    detectLanguage('मुझे पेमेंट की जानकारी बताओ').language,
    'hindi'
  );
});

test('detects Hinglish written in Latin script', () => {
  assert.equal(
    detectLanguage('Bhai invoice bana do').language,
    'hinglish'
  );
});

test('detects mixed Hindi and English scripts', () => {
  const result = detectLanguage('मुझे invoice बनाना है');

  assert.equal(result.language, 'hinglish');
  assert.equal(result.script, 'mixed');
  assert.equal(result.isMixed, true);
});

test('does not classify ordinary English as Hinglish', () => {
  assert.equal(
    detectLanguage('Please show my payment history').language,
    'english'
  );
});

test('returns unknown for empty input', () => {
  assert.equal(detectLanguage('').language, 'unknown');
});

test('returns unknown for input without supported letters', () => {
  assert.equal(detectLanguage('12345 !!!').language, 'unknown');
});
