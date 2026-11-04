import api from './client.js';

export const aiApi = {
  chat: (data) => api.post('/ai/chat', data),
  execute: (data) => api.post('/ai/execute', data),
  transcribeVoice: (data) => api.post('/ai/voice/transcribe', data),
  listConversations: () => api.get('/ai/conversations'),
  getConversation: (id) => api.get(`/ai/conversations/${id}`),
};
