import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_BYTES = 512 * 1024;

export class AIServiceError extends ApiError {
  constructor(statusCode, message, code, details = null) {
    super(statusCode, message, details, code);
  }
}

const withTimeout = (timeoutMs, signal) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
};

const readResponseBody = async (response) => {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new AIServiceError(502, "AI service response is too large.", "AI_RESPONSE_TOO_LARGE");
  }

  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
    throw new AIServiceError(502, "AI service response is too large.", "AI_RESPONSE_TOO_LARGE");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new AIServiceError(502, "AI service returned invalid JSON.", "AI_RESPONSE_INVALID");
  }
};

export const createAIClient = ({
  baseUrl = env.AI_SERVICE_URL,
  secret = env.INTERNAL_SERVICE_SECRET,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required for the AI service client.");
  }

  const interpret = async ({ message, conversationHistory = [], context = {}, signal }) => {
    if (!secret) {
      throw new AIServiceError(
        503,
        "AI service authentication is not configured.",
        "AI_SERVICE_AUTH_NOT_CONFIGURED",
      );
    }

    const request = withTimeout(timeoutMs, signal);
    let timeoutId;

    try {
      const fetchPromise = fetchImpl(`${baseUrl.replace(/\/$/, "")}/api/assistant/interpret`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ai-service-secret": secret,
        },
        body: JSON.stringify({ message, conversationHistory, context }),
        signal: request.signal,
      });
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new AIServiceError(504, "AI service request timed out.", "AI_SERVICE_TIMEOUT")),
          timeoutMs,
        );
      });
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      let payload;
      try {
        payload = await readResponseBody(response);
      } catch (error) {
        if (error instanceof AIServiceError) throw error;
        throw new AIServiceError(502, "AI service returned an unreadable response.", "AI_RESPONSE_INVALID");
      }

      if (!response.ok) {
        const statusCode = response.status === 401 ? 502 : response.status === 429 ? 503 : 502;
        throw new AIServiceError(
          statusCode,
          response.status === 429
            ? "AI service is rate limited."
            : "AI service request failed.",
          response.status === 401 ? "AI_SERVICE_AUTH_FAILED" : "AI_SERVICE_REQUEST_FAILED",
        );
      }

      if (!payload?.success || !payload.data || typeof payload.data !== "object") {
        throw new AIServiceError(502, "AI service returned an invalid response.", "AI_RESPONSE_INVALID");
      }

      return payload.data;
    } catch (error) {
      if (error instanceof AIServiceError) throw error;
      if (error.name === "AbortError") {
        throw new AIServiceError(504, "AI service request timed out.", "AI_SERVICE_TIMEOUT");
      }
      throw new AIServiceError(503, "AI service is unavailable.", "AI_SERVICE_UNAVAILABLE");
    } finally {
      clearTimeout(timeoutId);
      request.clear();
    }
  };

  return Object.freeze({ interpret });
};

export const aiClient = createAIClient();
