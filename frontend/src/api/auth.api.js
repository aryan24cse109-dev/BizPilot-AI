import api from './client.js';

export const authApi = {
  login: (data) => api.post('/auth/dev-login', data),
  devLogin: (data) => api.post('/auth/dev-login', data),
  googleLogin: (credential, accountCategory) =>
    api.post('/auth/google', { credential, accountCategory }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  onboarding: (data) => api.post('/users/onboarding', data),
};
