import api from './client.js';

export const clientsApi = {
  getConnections: (params) => api.get('/connections', { params }),
  createConnection: (username) => api.post('/connections', { username }),
  respondConnection: (id, decision) => api.patch(`/connections/${id}/respond`, { decision }),
  getInvitations: () => api.get('/invitations'),
  sendInvitation: (payload) =>
    api.post('/invitations', typeof payload === 'string' ? { email: payload } : payload),
  acceptInvitation: (token) => api.post('/invitations/accept', { token }),
};
