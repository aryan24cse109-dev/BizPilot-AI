import api from './client.js';

export const paymentsApi = {
  createOrder: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getWorkspacePayments: (params) => api.get('/payments/history/workspace', { params }),
  getClientPayments: (params) => api.get('/payments/history/client', { params }),
};
