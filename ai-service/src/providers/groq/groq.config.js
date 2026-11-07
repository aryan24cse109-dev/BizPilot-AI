
export const GROQ_CONFIG = Object.freeze({
  baseUrl: 'https://api.groq.com',
  chatCompletionsPath: '/openai/v1/chat/completions',
  defaultModel: 'openai/gpt-oss-120b',
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
