import api from './client.js';

export const businessApi = {
  getProfile: () => api.get('/business/profile'),
  updateProfile: (data) => api.patch('/business/profile', data),
};

