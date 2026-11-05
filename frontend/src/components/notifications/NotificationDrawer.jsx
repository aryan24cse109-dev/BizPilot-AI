import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext.jsx';
import {
  Bell,
  CheckCheck,
  Trash2,
  FileText,
  CreditCard,
  MessageSquare,
  Sparkles,
  X
} from 'lucide-react';

export const NotificationDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'INVOICE_RECEIVED':
      case 'INVOICE_VIEWED':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_REMINDER':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'MESSAGE_RECEIVED':
        return <MessageSquare className="w-4 h-4 text-sky-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#1C1D22]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[#1C1D22]/60 backdrop-blur-xs flex justify-end animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-[#1C1D22] border-l border-[#E8E4DC] dark:border-[#2B2C33] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-[#1C1D22] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E8E4DC] dark:border-[#2B2C33] bg-[#FAF8F5] dark:bg-[#25262C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] dark:bg-[#35363F] border border-[#E8E4DC] dark:border-white/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#1C1D22] dark:text-[#F5C869]" />
            </div>
            <h3 className="text-sm font-black text-[#1C1D22] dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-[#F5C869]/20 text-[#1C1D22] dark:text-[#F5C869] font-black px-2 py-0.5 rounded-full border border-[#E5B550]/40">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-[#1C1D22] dark:text-[#F5C869] hover:underline font-bold flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#8E9297] hover:text-[#1C1D22] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E8E4DC] dark:divide-[#2B2C33] p-2 space-y-1">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl transition group flex gap-3 items-start cursor-pointer border ${
                  n.isRead
                    ? 'border-transparent hover:bg-[#FAF8F5] dark:hover:bg-[#25262C] opacity-75'
                    : 'bg-[#FAF8F5] dark:bg-[#25262C]/70 border-[#E8E4DC] dark:border-white/10 hover:border-black/20'
                }`}
                onClick={() => {
                  markAsRead(n.id);
                  const targetLink = n.data?.link || n.link;
                  if (targetLink) {
                    navigate(targetLink);
                    onClose();
                  }
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#35363F] border border-[#E8E4DC] dark:border-white/10 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-[#1C1D22] dark:text-white leading-tight">
                      {n.title}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[#8E9297] hover:text-rose-600 transition p-1"
                      title="Clear"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#8E9297] mt-1 leading-snug font-medium">
                    {n.message || n.body}
                  </p>
                  <p className="text-[9px] text-[#8E9297] mt-1.5 font-mono">
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
            <div className="py-16 text-center text-xs text-[#8E9297] font-medium">
              No notifications at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
