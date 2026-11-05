import api from './client.js';

export const paymentsApi = {
  createOrder: (invoiceId, data = {}) => api.post(`/payments/invoices/${invoiceId}/order`, data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getPayments: (params) => api.get('/payments', { params }),
  getWorkspacePayments: (params) => api.get('/payments', { params }),
  getClientPayments: (params) => api.get('/payments', { params }),
  getPayment: (id) => api.get(`/payments/${id}`),
  getInvoicePayments: (invoiceId) => api.get(`/payments/invoices/${invoiceId}`),
};
