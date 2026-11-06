
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

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch { }

  // Try extracting markdown JSON block ```json ... ```
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch { }
  }

  // Try extracting the first outer JSON object { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch { }
  }

  // Fallback: If AI returned plain conversational text, wrap it into a valid conversational response
  return {
    type: 'conversation',
    intent: null,
    confidence: 0.95,
    entities: {},
    workflow: null,
    clarificationQuestion: null,
    response: cleaned
  };
};
