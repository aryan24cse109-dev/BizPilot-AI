export const SARVAM_CONFIG = Object.freeze({
  baseUrl: 'https://api.sarvam.ai',

  chatCompletionsPath: '/v1/chat/completions',

  defaultModel: 'sarvam-105b-conversations',

  defaultTemperature: 0.2,

  defaultMaxTokens: 2048,

  supportedRoles: Object.freeze([
    'system',
    'developer',
    'user',
    'assistant',
    'tool'
  ])
});