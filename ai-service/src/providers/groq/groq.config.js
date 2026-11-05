
export const GROQ_CONFIG = Object.freeze({
  baseUrl: 'https://api.groq.com',
  chatCompletionsPath: '/openai/v1/chat/completions',
  defaultModel: 'llama-3.3-70b-versatile',
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
