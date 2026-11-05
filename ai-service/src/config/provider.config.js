import { env } from './env.js';

export const PROVIDER_CONFIG = Object.freeze({
  sarvam: Object.freeze({
    name: 'sarvam',
    apiKey: env.SARVAM_API_KEY ?? null,
    model: env.SARVAM_MODEL ?? null,
    enabled: Boolean(env.SARVAM_API_KEY)
  }),

  groq: Object.freeze({
    name: 'groq',
    apiKey: env.GROQ_API_KEY ?? null,
    model: env.GROQ_MODEL ?? null,
    enabled: Boolean(env.GROQ_API_KEY)
  })
});

export const getProviderConfig = (providerName) => {
  const provider = PROVIDER_CONFIG[providerName];

  if (!provider) {
    throw new Error(
      `Unsupported AI provider: ${providerName}`
    );
  }

  return provider;
};

export const getConfiguredProviderNames = () => {
  return Object.values(PROVIDER_CONFIG)
    .filter((provider) => provider.enabled)
    .map((provider) => provider.name);
};