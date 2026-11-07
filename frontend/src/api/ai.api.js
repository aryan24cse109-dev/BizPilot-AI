import api from './client.js';

export const aiApi = {
  sendMessage: (message, conversationHistory = []) =>
    api.post('/assistant/message', { message, conversationHistory }),
  executeWorkflow: (operation, input, confirmed = false) =>
    api.post('/assistant/workflows/execute', { operation, input, confirmed }),
  transcribeVoice: ({ audio, language = 'unknown' }) =>
    api.post('/assistant/voice/transcribe', { audio, language }),
  // Aliases for compatibility
  chat: (data) =>
    api.post('/assistant/message', {
      message: data.message || data.prompt,
      conversationHistory: data.history || [],
    }),
  execute: (data) =>
    api.post('/assistant/workflows/execute', {
      operation: data.operation || data.action,
      input: data.input || data.parameters || {},
      confirmed: data.confirmed ?? false,
    }),
};
