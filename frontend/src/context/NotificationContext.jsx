import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext(null);

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif_1',
    type: 'INVOICE_RECEIVED',
    title: 'New Tax Invoice Received',
    message: 'TechNova Solutions has issued invoice INV-2026-001 for ₹15,000.',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isRead: false,
    link: '/portal/invoices',
  },
  {
    id: 'notif_2',
    type: 'PAYMENT_CONFIRMED',
    title: 'Payment Settlement Verified',
    message: 'Your payment of ₹25,000 via UPI was successfully verified and recorded.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    isRead: false,
    link: '/portal/history',
  },
  {
    id: 'notif_3',
    type: 'MESSAGE_RECEIVED',
    title: 'New Message from Rajesh Kumar',
    message: '"Please review the updated scope document for the cloud migration retainer."',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
    link: '/portal/messages',
  },
  {
    id: 'notif_4',
    type: 'INVOICE_DUE_SOON',
    title: 'Invoice Due in 3 Days',
    message: 'Invoice INV-2026-004 is due on 14 Nov 2026.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isRead: true,
    link: '/portal/invoices',
  },
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('bizpilot_notifications');
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('bizpilot_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addNotification = (notif) => {
    const newNotif = {
      id: `notif_${Date.now()}`,
      date: new Date().toISOString(),
      isRead: false,
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
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
