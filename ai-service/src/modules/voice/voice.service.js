import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

const MAX_AUDIO_BYTES = 700 * 1024;
const supportedAudio = /^data:(audio\/(?:webm|wav|x-wav|ogg|mp4|mpeg));base64,([A-Za-z0-9+/=\r\n]+)$/i;

export async function transcribeAudio({ audio, language = "unknown", fetchImpl = globalThis.fetch }) {
  const match = supportedAudio.exec(audio ?? "");
  if (!match) {
    throw new ApiError({
      statusCode: 400,
      message: "Unsupported audio format.",
      code: "AUDIO_INVALID",
    });
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > MAX_AUDIO_BYTES) {
    throw new ApiError({
      statusCode: 413,
      message: "Audio recording is empty or too large.",
      code: "AUDIO_TOO_LARGE",
    });
  }
  if (!env.SARVAM_API_KEY) {
    throw new ApiError({
      statusCode: 503,
      message: "Speech transcription is not configured.",
      code: "STT_NOT_CONFIGURED",
    });
  }

  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: match[1] }), "recording");
  formData.append("model", "saaras:v4");
  formData.append("language_code", language);

  const requestId = randomUUID();
  let response;
  try {
    response = await fetchImpl("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": env.SARVAM_API_KEY,
        "x-client-request-id": requestId,
      },
      body: formData,
    });
  } catch (error) {
    throw new ApiError({
      statusCode: 502,
      message: "Speech transcription provider is unavailable.",
      code: "STT_PROVIDER_UNAVAILABLE",
      details: { requestId },
      cause: error,
    });
  }

  if (!response.ok) {
    throw new ApiError({
      statusCode: 502,
      message: "Speech transcription provider rejected the recording.",
      code: "STT_PROVIDER_FAILED",
      details: { requestId, status: response.status },
    });
  }

  const payload = await response.json().catch(() => null);
  if (!payload?.transcript?.trim()) {
    throw new ApiError({
      statusCode: 502,
      message: "Speech transcription provider returned no transcript.",
      code: "STT_RESPONSE_INVALID",
      details: { requestId },
    });
  }

  return {
    transcript: payload.transcript.trim(),
    languageCode: payload.language_code || language,
    requestId,
  };
}
