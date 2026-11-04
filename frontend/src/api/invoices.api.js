import api from './client.js';

export const invoicesApi = {
  listWorkspaceInvoices: (params) => api.get('/invoices', { params }),
  listClientInvoices: (params) => api.get('/invoices/client-received', { params }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  createInvoice: (data) => api.post('/invoices', data),
  updateInvoice: (id, data) => api.put(`/invoices/${id}`, data),
  sendInvoice: (id) => api.post(`/invoices/${id}/send`),
  cancelInvoice: (id, data) => api.post(`/invoices/${id}/cancel`, data),
  downloadPdfUrl: (id) => `/api/v1/invoices/${id}/pdf`,
};
