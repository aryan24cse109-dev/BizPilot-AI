import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../api/notifications.api.js';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch from authoritative backend
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('bizpilot_token');
    if (!token) return;

    try {
      setLoading(true);
      const res = await notificationsApi.listNotifications();
      if (res?.data?.notifications) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount ?? res.data.notifications.filter((n) => !n.isRead).length);
      }
    } catch {
      // In case session is not authenticated yet or backend warming up
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationsApi.markAsRead(id);
    } catch (err) {
      console.warn('Failed to sync notification read state:', err.message);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.warn('Failed to mark all as read:', err.message);
    }
  };

  const clearNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.deleteNotification(id);
    } catch (err) {
      console.warn('Failed to delete notification:', err.message);
    }
  };

  const addNotification = (notif) => {
    const newNotif = {
      id: notif.id || `notif_${Date.now()}`,
      date: notif.date || new Date().toISOString(),
      isRead: false,
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearNotification,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
