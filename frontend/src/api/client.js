import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token & active workspace header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bizpilot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeWorkspaceId = localStorage.getItem('bizpilot_active_workspace');
    if (activeWorkspaceId) {
      config.headers['x-workspace-id'] = activeWorkspaceId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const responseData = error.response?.data;
    const clientError = new Error(
      responseData?.message || error.message || 'An unexpected error occurred.',
    );
    clientError.code = responseData?.code ?? responseData?.error?.code ?? null;
    clientError.requestId = responseData?.requestId ?? null;
    clientError.status = error.response?.status ?? null;
    clientError.details = responseData?.details ?? responseData?.error?.details ?? null;
    return Promise.reject(clientError);
  }
);

export default api;
