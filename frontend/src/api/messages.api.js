import api from './client.js';

export const messagesApi = {
  listConversations: () => api.get('/messages'),
  getOrCreateConversation: (recipientId) => api.post('/messages/start', { recipientId }),
  getMessages: (conversationId) => api.get(`/messages/${conversationId}`),
  sendMessage: (conversationId, content, metadata = {}) =>
    api.post(`/messages/${conversationId}`, { content, ...metadata }),
};

export default messagesApi;
