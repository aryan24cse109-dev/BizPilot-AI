
import { ApiError } from './ApiError.js';
import { HTTP_STATUS, ERROR_CODES } from './constants.js';

export const parseAIJson = (content) => {
  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError({
      statusCode: HTTP_STATUS.BAD_GATEWAY,
      message: 'AI provider returned an empty response.',
      code: ERROR_CODES.AI_RESPONSE_PARSE_ERROR
    });
  }

  let cleaned = content.trim();

  // Remove optional Markdown JSON fences.
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new ApiError({
      statusCode: HTTP_STATUS.BAD_GATEWAY,
      message: 'AI provider returned an invalid JSON response.',
      code: ERROR_CODES.AI_RESPONSE_PARSE_ERROR
    });
  }
};
