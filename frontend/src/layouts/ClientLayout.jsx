import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { NotificationDrawer } from '../components/notifications/NotificationDrawer.jsx';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  MessageSquare,
  User,
  ArrowLeftRight,
  Bell,
  LogOut,
  ShieldCheck,
  Building2,
  ChevronDown
} from 'lucide-react';

export const ClientLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, toggleRole, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const clientNavItems = [
    { name: 'Overview', path: '/portal', icon: LayoutDashboard, exact: true },
    { name: 'My Invoices', path: '/portal/invoices', icon: FileText },
    { name: 'Payment History', path: '/portal/history', icon: CreditCard },
    { name: 'Account Profile', path: '/portal/profile', icon: User },
  ];

  return (
    <div className="min-h-screen w-full flex bg-[#F7F5F0] text-[#1C1D22] font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. PROFESSIONAL FULL-HEIGHT LEFT SIDEBAR (Solid #1C1D22) */}
      {/* ======================================================== */}
      <aside
        className="w-64 h-screen sticky top-0 shrink-0 select-none flex flex-col justify-between p-5 z-30 border-r"
        style={{ backgroundColor: '#1C1D22', borderColor: '#2B2C33', color: '#FFFFFF' }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-3 px-2 py-2 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: '#2C2D35', border: '1px solid rgba(255, 255, 255, 0.12)' }}
            >
              <ShieldCheck className="w-5 h-5 text-[#CFDDC8]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-white leading-tight truncate">
                BizPilot <span style={{ color: '#CFDDC8' }}>Portal</span>
              </h1>
              <p className="text-[11px] font-medium leading-tight" style={{ color: '#8E9297' }}>
                Client Collaboration
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scroll">
            {clientNavItems.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className="relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
                  style={{
                    color: isActive ? '#F5C869' : '#8E9297',
                    backgroundColor: isActive ? 'rgba(245, 200, 105, 0.1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#8E9297';
                  }}
                >
                  {/* Left Accent Bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                      style={{ backgroundColor: '#F5C869' }}
                    />
                  )}

                  <div className="flex items-center gap-3">
                    <item.icon
                      className="w-4 h-4 shrink-0 transition-colors"
                      style={{ color: isActive ? '#F5C869' : '#8E9297' }}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className="text-[10px] text-white font-bold px-2 py-0.5 rounded-full shadow-xs"
                      style={{ backgroundColor: '#6375F0' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Action: Switch to Business & Logout */}
        <div
          className="pt-4 mt-4 border-t space-y-1.5"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
        >
          <button
            onClick={() => {
              toggleRole();
              navigate('/business');
            }}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            style={{ color: '#8E9297', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8E9297')}
          >
            <div className="flex items-center gap-2.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#F5C869]" />
              <span>Business Workspace</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Switch</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            style={{ color: '#8E9297' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8E9297')}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN APPLICATION CONTENT AREA                         */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#F7F5F0]">
        {/* Top Navbar */}
        <header
          className="h-16 px-6 lg:px-8 border-b flex items-center justify-between sticky top-0 z-20"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          {/* Left Context Info */}
          <div className="flex items-center gap-2.5">
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Switch to Business Workspace */}
            <button
              onClick={() => {
                toggleRole();
                navigate('/business');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-slate-400 transition shadow-xs"
              style={{ borderColor: '#E8E4DC', color: '#1C1D22', backgroundColor: '#FFFFFF' }}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#F5C869]" />
              <span className="hidden sm:inline">Switch to Business</span>
              <span className="sm:hidden">Business</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotificationDrawer(true)}
              className="p-2 rounded-xl border hover:bg-slate-50 transition relative"
              style={{ borderColor: '#E8E4DC', color: '#1C1D22' }}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#F5C869' }}
                />
              )}
            </button>

            {/* User Mini Avatar Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-xl border hover:border-slate-300 transition"
                style={{ borderColor: '#E8E4DC' }}
              >
                <img
                  src={
                    user?.avatar ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80'
                  }
                  alt="Avatar"
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <span className="text-xs font-bold text-[#1C1D22] pr-1 hidden md:inline">
                  {user?.name?.split(' ')[0] || 'Client'}
                </span>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white border rounded-2xl shadow-xl p-2 z-50 animate-in fade-in"
                  style={{ borderColor: '#E8E4DC' }}
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 text-xs">
                    <p className="font-bold text-slate-900">{user?.name}</p>
                    <p className="text-slate-400 truncate text-[11px]">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/portal/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 font-medium text-slate-700 mt-1"
                  >
                    Client Profile
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-rose-50 font-medium text-rose-600"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
      />
    </div>
  );
};
