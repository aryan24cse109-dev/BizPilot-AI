import api from './client.js';

export const messagesApi = {
  listConversations: () => api.get('/messages'),
  getOrCreateConversation: (recipient) =>
    api.post('/messages/start', {
      recipientId:
        typeof recipient === 'object'
          ? recipient.recipientId || recipient.recipient || recipient.email
          : recipient,
    }),
  getMessages: (conversationId) => api.get(`/messages/${conversationId}`),
  sendMessage: (conversationId, payload, metadata = {}) => {
    const body =
      typeof payload === 'string'
        ? { content: payload, ...metadata }
        : { ...payload, ...metadata };
    return api.post(`/messages/${conversationId}`, body);
  },
};

export default messagesApi;
