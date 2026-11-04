import api from './client.js';

export const clientsApi = {
  searchUsers: (q) => api.get('/clients/search', { params: { q } }),
  getConnections: () => api.get('/clients/connections'),
  sendConnectRequest: (data) => api.post('/clients/connect', data),
  respondConnection: (id, accept) => api.post(`/clients/connections/${id}/respond`, { accept }),
};
