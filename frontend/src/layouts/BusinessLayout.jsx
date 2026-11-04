import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { NotificationDrawer } from '../components/notifications/NotificationDrawer.jsx';
import {
  LayoutDashboard,
  Bot,
  FileText,
  Users,
  Search,
  CreditCard,
  MessageSquare,
  TrendingUp,
  Settings,
  Building2,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Bell,
  ArrowLeftRight,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export const BusinessLayout = () => {
  const navigate = useNavigate();
  const { user, activeWorkspace, activeRole, toggleRole, switchWorkspace, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { unreadCount } = useNotifications();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const allWorkspaces = [
    ...(user?.workspacesOwned || []),
    ...(user?.workspaceMembers?.map((m) => m.workspace) || []),
  ];

  const businessNavItems = [
    { name: 'Dashboard', path: '/business', icon: LayoutDashboard },
    { name: 'AI Business Assistant', path: '/business/ai', icon: Bot, badge: 'Voice AI' },
    { name: 'Invoices', path: '/business/invoices', icon: FileText },
    { name: 'Clients', path: '/business/clients', icon: Users },
    { name: 'Discover', path: '/business/discover', icon: Search },
    { name: 'Payments & Collections', path: '/business/payments', icon: CreditCard },
    { name: 'Messages', path: '/business/messages', icon: MessageSquare },
    { name: 'Business Intelligence', path: '/business/analytics', icon: TrendingUp },
    { name: 'Settings', path: '/business/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Collapsible Business Sidebar */}
      <aside
        className={`bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none transition-all duration-300 z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-primary flex items-center justify-center text-white font-black shadow-md shadow-emerald-500/20 shrink-0">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                    BizPilot <span className="text-emerald-primary text-xs font-mono font-bold">BIZ</span>
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Business Operations</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {businessNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/business'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-primary/10 text-emerald-primary dark:text-emerald-400 font-semibold border border-emerald-primary/30 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-charcoal-800/60'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0 text-current" />
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-emerald-primary text-white font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Sandbox Card */}
        {!sidebarCollapsed && (
          <div className="p-3 m-3 rounded-2xl bg-surface-light dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-primary animate-ping" />
                Active Gateway
              </span>
              <span className="text-[9px] text-emerald-primary font-mono bg-emerald-500/10 px-1 rounded">
                SANDBOX
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              PostgreSQL 18 & Razorpay Sandbox Active
            </p>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between">
          {/* Workspace Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-charcoal-800 border border-slate-200 dark:border-slate-700 text-left transition hover:border-emerald-primary/40"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-primary/20 text-emerald-primary flex items-center justify-center font-bold text-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {activeWorkspace?.name || 'Default Workspace'}
                </p>
                <p className="text-[10px] text-emerald-primary font-medium">
                  {activeWorkspace?.currency || 'INR'} • Business Workspace
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showWorkspaceMenu && (
              <div
                className="absolute left-0 mt-2 w-64 bg-surface-light dark:bg-charcoal-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in"
                onMouseLeave={() => setShowWorkspaceMenu(false)}
              >
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  Switch Business Workspace
                </p>
                {allWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition ${
                      activeWorkspace?.id === ws.id
                        ? 'bg-emerald-primary/10 text-emerald-primary font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {activeWorkspace?.id === ws.id && <Check className="w-4 h-4 text-emerald-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Context Switcher Button to Client Portal */}
            <button
              onClick={() => {
                toggleRole();
                navigate('/portal');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-primary/40 bg-emerald-500/10 text-emerald-primary text-xs font-semibold hover:bg-emerald-500/20 transition shadow-xs"
              title="Switch to Client User Perspective"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Switch to Client Portal</span>
              <span className="sm:hidden">Client View</span>
            </button>

            {/* Theme Toggle (Light / Dark) */}
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

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-charcoal-800 transition"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-primary/20 text-emerald-primary border border-emerald-primary/30 flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BP'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {user?.name || 'Business Leader'}
                  </p>
                  <p className="text-[10px] text-slate-400">@{user?.username || 'admin'}</p>
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

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
      />
    </div>
  );
};
