import api from './client.js';

export const dashboardApi = {
  getDashboard: (params) => api.get('/dashboard', { params }),
  getDashboardInvoices: (params) => api.get('/dashboard/invoices', { params }),
  getDashboardTransactions: (params) => api.get('/dashboard/transactions', { params }),
  getBusinessDashboard: (params) => api.get('/dashboard', { params }),
  getClientDashboard: (params) => api.get('/dashboard', { params }),
  getBusinessIntelligence: (params) => api.get('/dashboard', { params }),
};
