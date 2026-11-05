
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractJSONText,
  extractJSONObject,
  JSONExtractionError
} from '../../../../src/modules/assistant/output/json.extractor.js';

test('extracts plain JSON', () => {
  const result = extractJSONObject('{"type":"conversation"}');

  assert.equal(result.type, 'conversation');
});

test('extracts JSON from a markdown code fence', () => {
  const result = extractJSONObject(
    '```json\n{"type":"conversation"}\n```'
  );

  assert.equal(result.type, 'conversation');
});

test('extracts JSON from surrounding explanatory text', () => {
  const result = extractJSONObject(
    'Here is the result: {"type":"conversation"} Hope this helps.'
  );

  assert.equal(result.type, 'conversation');
});

test('preserves braces inside JSON string values', () => {
  const result = extractJSONObject(
    '{"response":"This value contains {braces}"}'
  );

  assert.equal(result.response, 'This value contains {braces}');
});

test('handles escaped quotation marks', () => {
  const result = extractJSONObject(
    '{"response":"He said \\"hello\\""}'
  );

  assert.equal(result.response, 'He said "hello"');
});

test('extracts JSON text from a fenced response', () => {
  const result = extractJSONText(
    '```json\n{"valid":true}\n```'
  );

  assert.equal(result, '{"valid":true}');
});

test('rejects empty input', () => {
  assert.throws(
    () => extractJSONObject(''),
    JSONExtractionError
  );
});

test('rejects a response without a JSON object', () => {
  assert.throws(
    () => extractJSONObject('I cannot help with that request.'),
    JSONExtractionError
  );
});

test('rejects incomplete JSON', () => {
  assert.throws(
    () => extractJSONObject('{"type":"conversation"'),
    JSONExtractionError
  );
});

test('rejects malformed JSON', () => {
  assert.throws(
    () => extractJSONObject('{"type": conversation}'),
    JSONExtractionError
  );
});

test('rejects JSON arrays', () => {
  assert.throws(
    () => extractJSONObject('[{"type":"conversation"}]'),
    JSONExtractionError
  );
});
