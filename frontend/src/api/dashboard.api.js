import api from './client.js';

export const dashboardApi = {
  getDashboard: (params = {}) => api.get('/dashboard', { params: { role: 'business', ...params } }),
  getDashboardInvoices: (params = {}) => api.get('/dashboard/invoices', { params: { role: 'business', ...params } }),
  getDashboardTransactions: (params = {}) => api.get('/dashboard/transactions', { params: { role: 'business', ...params } }),
  getBusinessDashboard: (params = {}) => api.get('/dashboard', { params: { role: 'business', ...params } }),
  getClientDashboard: (params = {}) => api.get('/dashboard', { params: { role: 'client', ...params } }),
  getBusinessIntelligence: (params = {}) => api.get('/dashboard', { params: { role: 'business', ...params } }),
};

export default dashboardApi;
