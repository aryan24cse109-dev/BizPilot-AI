import api from './client.js';

export const clientsApi = {
  getConnections: (params) => api.get('/connections', { params }),
  createConnection: (username) => api.post('/connections', { username }),
  respondConnection: (id, decision) => api.patch(`/connections/${id}/respond`, { decision }),
  getInvitations: () => api.get('/invitations'),
  sendInvitation: (email) => api.post('/invitations', { email }),
  acceptInvitation: (token) => api.post('/invitations/accept', { token }),
};
