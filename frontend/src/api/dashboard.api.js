import api from './client.js';

export const dashboardApi = {
  getBusinessDashboard: (params) => api.get('/dashboard/business', { params }),
  getClientDashboard: () => api.get('/dashboard/client'),
  getBusinessIntelligence: () => api.get('/dashboard/analytics'),
};
