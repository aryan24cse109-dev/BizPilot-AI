
import { ApiError } from './ApiError.js';
import { HTTP_STATUS, ERROR_CODES } from './constants.js';

const createParseError = (reason) =>
  new ApiError({
    statusCode: HTTP_STATUS.BAD_GATEWAY,
    message: 'AI provider returned an invalid JSON response.',
    code: ERROR_CODES.AI_RESPONSE_PARSE_ERROR,
    details: { reason }
  });

export const parseAIJson = (content) => {
  if (typeof content !== 'string' || !content.trim()) {
    throw createParseError('empty_response');
  }

  const cleaned = content.trim();

  // Accept a complete Markdown JSON code block.
  const fencedMatch = cleaned.match(
    /^```(?:json)?\s*([\s\S]*?)\s*```$/i
  );

  const candidate = fencedMatch
    ? fencedMatch[1].trim()
    : cleaned;

  let parsed;

  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw createParseError('malformed_json');
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    throw createParseError('response_must_be_a_json_object');
  }

  return parsed;
};
