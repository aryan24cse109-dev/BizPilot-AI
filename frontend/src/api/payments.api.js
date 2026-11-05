import api from './client.js';

export const paymentsApi = {
  createOrder: (arg1, arg2 = {}) => {
    if (typeof arg1 === 'object' && arg1 !== null && arg1.invoiceId) {
      const { invoiceId, ...data } = arg1;
      return api.post(`/payments/invoices/${invoiceId}/order`, data);
    }
    return api.post(`/payments/invoices/${arg1}/order`, arg2);
  },
  verifyPayment: (data) => api.post('/payments/verify', data),
  getPayments: (params = {}) => api.get('/payments', { params }),
  getWorkspacePayments: (params = {}) => api.get('/payments', { params: { role: 'business', ...params } }),
  getClientPayments: (params = {}) => api.get('/payments', { params: { role: 'client', ...params } }),
  getPayment: (id) => api.get(`/payments/${id}`),
  getInvoicePayments: (invoiceId) => api.get(`/payments/invoices/${invoiceId}`),
};

export default paymentsApi;
