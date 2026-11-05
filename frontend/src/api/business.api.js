import api from './client.js';

export const businessApi = {
  getProfile: () => api.get('/business/profile'),
};
