
export class JSONExtractionError extends Error {
  constructor(message = 'Unable to extract valid JSON from AI response.') {
    super(message);
    this.name = 'JSONExtractionError';
  }
}

/**
 * Extracts the first balanced JSON object from text.
 * Handles braces inside strings and escaped quotation marks.
 */
const extractBalancedJSONObject = (text) => {
  const startIndex = text.indexOf('{');

  if (startIndex === -1) {
    throw new JSONExtractionError('No JSON object found in AI response.');
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        insideString = false;
      }

      continue;
    }

    if (character === '"') {
      insideString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  throw new JSONExtractionError('AI response contains incomplete JSON.');
};

/**
 * Extracts JSON text from a raw AI response.
 * Supports plain JSON, fenced JSON, and explanatory text around JSON.
 */
export const extractJSONText = (input) => {
  if (typeof input !== 'string' || !input.trim()) {
    throw new JSONExtractionError('AI response is empty.');
  }

  const text = input.trim();

  // Handle Markdown code fences.
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]?.trim()) {
    const fencedContent = fencedMatch[1].trim();

    if (fencedContent.startsWith('[')) {
      throw new JSONExtractionError(
        'AI response must contain a JSON object, not an array.'
      );
    }

    return fencedContent;
  }

  // Reject an array when it appears before any JSON object.
  const firstObjectIndex = text.indexOf('{');
  const firstArrayIndex = text.indexOf('[');

  if (
    firstArrayIndex !== -1 &&
    (firstObjectIndex === -1 || firstArrayIndex < firstObjectIndex)
  ) {
    throw new JSONExtractionError(
      'AI response must contain a JSON object, not an array.'
    );
  }

  return extractBalancedJSONObject(text);
};

/**
 * Extracts and parses a JSON object from an AI response.
 */
export const extractJSONObject = (input) => {
  const jsonText = extractJSONText(input);

  try {
    const parsed = JSON.parse(jsonText);

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new JSONExtractionError(
        'AI response must contain a JSON object.'
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof JSONExtractionError) {
      throw error;
    }

    throw new JSONExtractionError('AI response contains invalid JSON.');
  }
};
