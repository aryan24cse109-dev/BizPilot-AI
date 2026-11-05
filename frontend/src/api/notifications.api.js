import api from './client.js';

export const notificationsApi = {
  /**
   * List notifications for authenticated user
   */
  listNotifications: (params = {}) => api.get('/notifications', { params }),

  /**
   * Mark a single notification as read
   */
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => api.patch('/notifications/read-all'),

  /**
   * Delete a notification
   */
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

