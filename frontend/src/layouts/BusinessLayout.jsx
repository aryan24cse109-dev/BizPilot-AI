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
  Package,
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
  ArrowLeftRight,
  Check,
  Search,
  SlidersHorizontal
} from 'lucide-react';

export const BusinessLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeWorkspace, toggleRole, switchWorkspace, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { unreadCount } = useNotifications();

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const allWorkspaces = [
    ...(user?.workspacesOwned || []),
    ...(user?.workspaceMembers?.map((m) => m.workspace) || []),
  ];

  const navItems = [
    { name: 'Dashboard', path: '/business', icon: LayoutDashboard },
    { name: 'Invoices', path: '/business/invoices', icon: FileText },
    { name: 'Clients', path: '/business/clients', icon: Users },
    { name: 'Payments', path: '/business/payments', icon: CreditCard },
    { name: 'Analytics', path: '/business/analytics', icon: TrendingUp },
    { name: 'AI Assistant', path: '/business/ai', icon: Sparkles },
    { name: 'Settings', path: '/business/settings', icon: Settings },
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
          {/* Top Brand / Logo */}
          <div className="flex items-center gap-3 px-2 py-2 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: '#2C2D35', border: '1px solid rgba(255, 255, 255, 0.12)' }}
            >
              <div className="w-5 h-5 rounded-md bg-[#F5C869] flex items-center justify-center text-[#1C1D22] font-black text-xs">
                BP
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-white leading-tight truncate">
                BizPilot <span style={{ color: '#F5C869' }}>AI</span>
              </h1>
              <p className="text-[11px] font-medium leading-tight" style={{ color: '#8E9297' }}>
                Financial Operations
              </p>
            </div>
          </div>

          {/* Profile Card in Sidebar matching reference aesthetic */}
          <div
            className="rounded-2xl p-4 mb-6 flex flex-col items-center text-center relative border"
            style={{
              backgroundColor: '#25262C',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="relative mb-2">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'
                }
                alt="Avatar"
                className="w-14 h-14 rounded-full object-cover shadow-inner"
                style={{ border: '2px solid rgba(255, 255, 255, 0.25)' }}
              />
              <span
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1C1D22]"
                style={{ backgroundColor: '#10B981' }}
                title="Online"
              />
            </div>
            <span className="text-[11px] font-medium block" style={{ color: '#8E9297' }}>
              Welcome Back,
            </span>
            <p className="text-sm font-bold text-white mt-0.5 tracking-tight truncate max-w-[180px]">
              {user?.name || 'Rahul Sharma'}
            </p>
            <span
              className="text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(245, 200, 105, 0.15)', color: '#F5C869' }}
            >
              {activeWorkspace?.name || 'Rahul Enterprises'}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scroll">
            {navItems.map((item) => {
              const isActive =
                item.path === '/business'
                  ? location.pathname === '/business'
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
                  {/* Left Golden Accent Indicator */}
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

        {/* Bottom Sidebar Action: Switch Portal & Logout */}
        <div
          className="pt-4 mt-4 border-t space-y-1.5"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
        >
          <button
            onClick={() => {
              toggleRole();
              navigate('/portal');
            }}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            style={{ color: '#8E9297', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8E9297')}
          >
            <div className="flex items-center gap-2.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#F5C869]" />
              <span>Client Portal</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500">View</span>
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
          {/* Left: Active Workspace Selector */}
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border"
              style={{ backgroundColor: '#FAF8F5', borderColor: '#E8E4DC', color: '#1C1D22' }}
            >
              <Building2 className="w-3.5 h-3.5 text-[#1C1D22]" />
              <span className="max-w-[160px] truncate">{activeWorkspace?.name || 'Rahul Enterprises'}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showWorkspaceMenu && (
              <div
                className="absolute left-0 mt-2 w-64 bg-white border rounded-2xl shadow-xl p-2 z-50 animate-in fade-in"
                style={{ borderColor: '#E8E4DC' }}
                onMouseLeave={() => setShowWorkspaceMenu(false)}
              >
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5">
                  Switch Workspace
                </p>
                {allWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws);
                      setShowWorkspaceMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-[#FAF8F5] flex items-center justify-between transition"
                  >
                    <span className="font-semibold text-slate-800 truncate">{ws.name}</span>
                    {activeWorkspace?.id === ws.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-3">
            {/* Direct Client Portal Switcher */}
            <button
              onClick={() => {
                toggleRole();
                navigate('/portal');
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-slate-400 transition shadow-xs"
              style={{ borderColor: '#E8E4DC', color: '#1C1D22', backgroundColor: '#FFFFFF' }}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#F5C869]" />
              <span>Client Portal</span>
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

            {/* User Avatar Mini Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-xl border hover:border-slate-300 transition"
                style={{ borderColor: '#E8E4DC' }}
              >
                <img
                  src={
                    user?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'
                  }
                  alt="Avatar"
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <span className="text-xs font-bold text-[#1C1D22] pr-1 hidden md:inline">
                  {user?.name?.split(' ')[0] || 'Rahul'}
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
                      navigate('/business/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 font-medium text-slate-700 mt-1"
                  >
                    Account Settings
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

        {/* Main Viewport Content */}
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
