import api from './client.js';

export const invoicesApi = {
  listWorkspaceInvoices: (params = {}) => api.get('/invoices', { params: { role: 'business', ...params } }),
  listClientInvoices: (params = {}) => api.get('/invoices', { params: { role: 'client', ...params } }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  createInvoice: (data) => api.post('/invoices', data),
  updateInvoice: (id, data) => api.patch(`/invoices/${id}`, data),
  sendInvoice: (id) => api.post(`/invoices/${id}/send`),
  cancelInvoice: (id, data) => api.post(`/invoices/${id}/cancel`, data),
  downloadPdfUrl: (id) => `/api/invoices/${id}/pdf`,
};

export default invoicesApi;
