import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { NotificationDrawer } from '../components/notifications/NotificationDrawer.jsx';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  FileText,
  Users,
  MessageSquare,
  Sparkles,
  Settings,
  Building2,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Bell,
  Check,
  Search,
  ShieldCheck,
  Home,
  User,
  History,
  Briefcase,
  Layers
} from 'lucide-react';

export const UnifiedLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { unreadCount } = useNotifications();

  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Business Workspace Nav Items (Requirement 5)
  const businessNavItems = [
    { name: 'Dashboard', path: '/business', icon: LayoutDashboard, exact: true },
    { name: 'AI Assistant', path: '/business/ai', icon: Sparkles },
    { name: 'Invoices', path: '/business/invoices', icon: FileText },
    { name: 'Clients', path: '/business/clients', icon: Users },
    { name: 'Payments', path: '/business/payments', icon: CreditCard },
    { name: 'Messages', path: '/business/messages', icon: MessageSquare },
    { name: 'Analytics', path: '/business/analytics', icon: TrendingUp },
    { name: 'Settings', path: '/business/settings', icon: Settings },
  ];

  // Client Portal Nav Items (Requirement 5)
  const clientNavItems = [
    { name: 'Home', path: '/portal', icon: Home, exact: true },
    { name: 'My Invoices', path: '/portal/invoices', icon: FileText },
    { name: 'Messages', path: '/portal/messages', icon: MessageSquare },
    { name: 'Payments', path: '/portal/invoices', icon: CreditCard },
    { name: 'Payment History', path: '/portal/history', icon: History },
    { name: 'Profile', path: '/portal/profile', icon: User },
  ];

  const isClientView = location.pathname.startsWith('/portal');

  return (
    <div className="min-h-screen w-full flex bg-[#F7F5F0] text-[#1C1D22] font-sans antialiased">
      {/* ======================================================== */}
      {/* UNIFIED DUAL-ROLE SIDEBAR (#1C1D22)                     */}
      {/* ======================================================== */}
      <aside
        className="w-64 h-screen sticky top-0 shrink-0 select-none flex flex-col justify-between p-4 z-30 border-r"
        style={{ backgroundColor: '#1C1D22', borderColor: '#2B2C33', color: '#FFFFFF' }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand / Logo */}
          <div className="flex items-center gap-3 px-2 py-1.5 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: '#2C2D35', border: '1px solid rgba(255, 255, 255, 0.12)' }}
            >
              <div className="w-5 h-5 rounded-md bg-[#F5C869] flex items-center justify-center text-[#1C1D22] font-black text-xs">
                BP
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-white leading-tight truncate">
                BizPilot <span style={{ color: '#F5C869' }}>AI</span>
              </h1>
              <p className="text-[10px] font-medium leading-tight flex items-center gap-1.5 mt-0.5" style={{ color: '#8E9297' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Dual Role Workspace
              </p>
            </div>
          </div>

          {/* User Profile Mini Pill */}
          <div
            className="rounded-xl p-2.5 mb-4 flex items-center gap-2.5 border"
            style={{ backgroundColor: '#25262C', borderColor: 'rgba(255, 255, 255, 0.08)' }}
          >
            <div className="w-8 h-8 rounded-full bg-[#35363F] border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.fullName?.charAt(0) || user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {user?.fullName || user?.name || 'Authorized User'}
              </p>
              <p className="text-[10px] text-[#8E9297] truncate font-mono">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Unified Navigation List (Scrollable) */}
          <nav className="overflow-y-auto flex-1 pr-1 space-y-4 custom-scroll">
            {/* SECTION 1: BUSINESS WORKSPACE */}
            <div>
              <div className="flex items-center justify-between px-3 py-1 mb-1.5">
                <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 text-[#F5C869]">
                  <Briefcase className="w-3 h-3" /> Business Workspace
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F5C869]/20 text-[#F5C869] font-bold">
                  PRO
                </span>
              </div>

              <div className="space-y-0.5">
                {businessNavItems.map((item) => {
                  const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={`biz_${item.name}`}
                      to={item.path}
                      className="relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{
                        color: isActive ? '#F5C869' : '#8E9297',
                        backgroundColor: isActive ? 'rgba(245, 200, 105, 0.12)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = '#8E9297';
                      }}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                          style={{ backgroundColor: '#F5C869' }}
                        />
                      )}
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          className="w-4 h-4 shrink-0 transition-colors"
                          style={{ color: isActive ? '#F5C869' : '#8E9297' }}
                        />
                        <span>{item.name}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: CLIENT PORTAL */}
            <div className="pt-2 border-t border-[#2B2C33]">
              <div className="flex items-center justify-between px-3 py-1 mb-1.5">
                <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 text-[#CFDDC8]">
                  <ShieldCheck className="w-3 h-3" /> Client Portal
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#CFDDC8]/20 text-[#CFDDC8] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-0.5">
                {clientNavItems.map((item) => {
                  const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={`client_${item.name}`}
                      to={item.path}
                      className="relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{
                        color: isActive ? '#CFDDC8' : '#8E9297',
                        backgroundColor: isActive ? 'rgba(207, 221, 200, 0.12)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = '#8E9297';
                      }}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                          style={{ backgroundColor: '#CFDDC8' }}
                        />
                      )}
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          className="w-4 h-4 shrink-0 transition-colors"
                          style={{ color: isActive ? '#CFDDC8' : '#8E9297' }}
                        />
                        <span>{item.name}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Bottom Controls */}
          <div className="pt-3 border-t border-[#2B2C33] mt-2 flex items-center justify-between px-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[#25262C] text-[#8E9297] hover:text-white transition"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowNotificationDrawer(true)}
              className="p-2 rounded-xl hover:bg-[#25262C] text-[#8E9297] hover:text-white transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-rose-500/20 text-[#8E9297] hover:text-rose-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE / CONTENT PANE                         */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F7F5F0] overflow-y-auto min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#F7F5F0]/90 backdrop-blur-md px-6 py-3.5 border-b border-[#E8E4DC] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                isClientView
                  ? 'bg-[#CFDDC8]/30 border-[#B8CEB0] text-emerald-900'
                  : 'bg-[#F5C869]/20 border-[#E5B550] text-[#1C1D22]'
              }`}
            >
              {isClientView ? 'Client Portal Mode' : 'Business Workspace Mode'}
            </span>
            <span className="text-xs text-[#8E9297] hidden sm:inline">
              {isClientView
                ? 'Reviewing received invoices & vendor payments'
                : 'Managing enterprise billing, receivables & operations'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-[#1C1D22]">{user?.fullName || user?.name}</p>
              <p className="text-[10px] text-[#8E9297]">
                {user?.accountCategory === 'BUSINESS' ? 'Verified Business Owner' : 'Verified Client'}
              </p>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <div className="p-6 md:p-8 flex-1">
          <Outlet />
        </div>
      </main>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
      />
    </div>
  );
};

export default UnifiedLayout;
