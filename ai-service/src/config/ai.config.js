import { env } from './env.js';

export const aiConfig = Object.freeze({
  primaryProvider: env.AI_PRIMARY_PROVIDER,

  fallbackProvider: env.AI_FALLBACK_PROVIDER,

  requestTimeoutMs: env.AI_REQUEST_TIMEOUT_MS,

  maxRetries: env.AI_MAX_RETRIES,

  providers: Object.freeze({
    sarvam: Object.freeze({
      enabled: Boolean(env.SARVAM_API_KEY),
      model: env.SARVAM_MODEL ?? null
    }),

    groq: Object.freeze({
      enabled: Boolean(env.GROQ_API_KEY),
      model: env.GROQ_MODEL ?? null
    })
  })
});

export const getAvailableProviders = () => {
  return Object.entries(aiConfig.providers)
    .filter(([, config]) => config.enabled)
    .map(([provider]) => provider);
};

export const isProviderConfigured = (provider) => {
  return Boolean(aiConfig.providers[provider]?.enabled);
};