import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { NotificationDrawer } from '../components/notifications/NotificationDrawer.jsx';
import {
  Home,
  FileText,
  CreditCard,
  MessageSquare,
  User,
  ArrowLeftRight,
  Sun,
  Moon,
  Bell,
  LogOut,
  ShieldCheck,
  CheckCircle,
  Building
} from 'lucide-react';

export const ClientLayout = () => {
  const navigate = useNavigate();
  const { user, toggleRole, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const clientNavItems = [
    { name: 'Client Home', path: '/portal', icon: Home, end: true },
    { name: 'My Invoices', path: '/portal/invoices', icon: FileText, end: false },
    { name: 'Payment History', path: '/portal/history', icon: CreditCard, end: false },
    { name: 'Messages', path: '/portal/messages', icon: MessageSquare, end: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Client Portal Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        {/* Brand & Client Portal Indicator */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => navigate('/portal')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-primary" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                BizPilot <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-primary font-bold border border-emerald-500/20">Client Portal</span>
              </h1>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {clientNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-primary/10 text-emerald-primary dark:text-emerald-400 border border-emerald-primary/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-charcoal-800'
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Switch to Business Workspace (Role Toggle) */}
          <button
            onClick={() => {
              toggleRole();
              navigate('/business');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-emerald-primary/50 transition shadow-xs"
            title="Switch back to Business Owner perspective"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-primary" />
            <span className="hidden sm:inline">Business Workspace</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setShowNotificationDrawer(true)}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-primary" />
            )}
          </button>

          {/* User Account / Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-charcoal-800 transition"
            >
              <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'CL'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.name || 'Client User'}
                </p>
                <p className="text-[10px] text-slate-400">Verified Client</p>
              </div>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-52 bg-surface-light dark:bg-charcoal-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 truncate text-[11px]">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/portal/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition text-left"
                  >
                    <User className="w-4 h-4" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <nav className="md:hidden flex items-center justify-around border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark px-2 py-2">
        {clientNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
                isActive
                  ? 'text-emerald-primary'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
      />
    </div>
  );
};
