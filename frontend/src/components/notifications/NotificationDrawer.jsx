import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext.jsx';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  FileText,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  X
} from 'lucide-react';

export const NotificationDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'INVOICE_RECEIVED':
      case 'INVOICE_DUE_SOON':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'PAYMENT_CONFIRMED':
        return <CreditCard className="w-4 h-4 text-teal-400" />;
      case 'MESSAGE_RECEIVED':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div
        className="w-full max-w-sm bg-surface-light dark:bg-charcoal-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-primary" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-primary font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-emerald-primary hover:underline font-semibold flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl transition group flex gap-3 items-start ${
                  n.isRead
                    ? 'hover:bg-slate-100 dark:hover:bg-charcoal-800/40 opacity-75'
                    : 'bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10'
                }`}
                onClick={() => {
                  markAsRead(n.id);
                  if (n.link) {
                    navigate(n.link);
                    onClose();
                  }
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-charcoal-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {n.title}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition p-0.5"
                      title="Clear"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                    {n.message}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-mono">
                    {new Date(n.date).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No notifications at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
