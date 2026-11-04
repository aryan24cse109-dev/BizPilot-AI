import api from './client.js';

export const messagesApi = {
  listConversations: () => api.get('/messages'),
  startConversation: (recipientId) => api.post('/messages/start', { recipientId }),
  getMessages: (id) => api.get(`/messages/${id}`),
  sendMessage: (id, data) => api.post(`/messages/${id}`, data),
};
