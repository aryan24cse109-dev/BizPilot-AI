import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
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

  // Dynamic Role Mode Resolution
  // 1. Business Owner Only: owns business workspace and has NO client relationships
  // 2. Client Only: registered as client and has NO business workspace
  // 3. Dual-Role User: owns business workspace AND is registered as a client of another business owner
  const isBusinessOwner = user?.roleCapabilities?.isBusinessOwner ?? (
    user?.accountCategory === 'BUSINESS' || Boolean(user?.businessProfile)
  );

  const isClient = user?.roleCapabilities?.isClient ?? (
    user?.accountCategory === 'CLIENT' || Boolean(user?.roleCapabilities?.clientInvoicesCount > 0)
  );

  const navigationMode = user?.roleCapabilities?.navigationMode || (
    isBusinessOwner && isClient
      ? 'DUAL_ROLE'
      : isBusinessOwner
        ? 'BUSINESS_ONLY'
        : 'CLIENT_ONLY'
  );

  const showBusinessSection = navigationMode === 'DUAL_ROLE' || navigationMode === 'BUSINESS_ONLY';
  const showClientSection = navigationMode === 'DUAL_ROLE' || navigationMode === 'CLIENT_ONLY';

  const isClientView = location.pathname.startsWith('/portal');

  return (
    <div className="min-h-screen w-full flex bg-[#F7F5F0] text-[#1C1D22] font-sans antialiased">
      {/* ======================================================== */}
      {/* DYNAMIC ROLE-BASED SIDEBAR (#1C1D22)                     */}
      {/* ======================================================== */}
      <aside
        className="w-64 h-screen sticky top-0 shrink-0 select-none flex flex-col justify-between p-4 z-30 border-r"
        style={{ backgroundColor: '#1C1D22', borderColor: '#2B2C33', color: '#FFFFFF' }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand / Wealthra Logo */}
          <div className="px-2 pt-2 pb-3 mb-4 flex flex-col items-center justify-center text-center border-b border-white/5">
            <Link to="/" className="flex items-center justify-center w-full mb-2">
              <img
                src="/wealthra-logo.png"
                alt="Wealthra"
                className="h-12 sm:h-14 w-auto max-w-[210px] object-contain mx-auto transition-transform hover:scale-105"
              />
            </Link>
            <p className="text-[10px] font-medium leading-tight flex items-center justify-center gap-1.5" style={{ color: '#8E9297' }}>
              {navigationMode === 'DUAL_ROLE' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Dual Role Workspace</span>
                </>
              )}
              {navigationMode === 'BUSINESS_ONLY' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5C869]" />
                  <span>Business Workspace</span>
                </>
              )}
              {navigationMode === 'CLIENT_ONLY' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CFDDC8]" />
                  <span>Client Portal</span>
                </>
              )}
            </p>
          </div>

          {/* Navigation List (Scrollable) */}
          <nav className="overflow-y-auto flex-1 pr-1 space-y-4 custom-scroll">
            {/* SECTION 1: BUSINESS WORKSPACE */}
            {showBusinessSection && (
              <div>
                {navigationMode === 'DUAL_ROLE' && (
                  <div className="flex items-center justify-between px-3 py-1 mb-1.5">
                    <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 text-[#F5C869]">
                      <Briefcase className="w-3 h-3" /> Business Workspace
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F5C869]/20 text-[#F5C869] font-bold">
                      PRO
                    </span>
                  </div>
                )}

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
            )}

            {/* SECTION 2: CLIENT PORTAL */}
            {showClientSection && (
              <div className={showBusinessSection && navigationMode === 'DUAL_ROLE' ? 'pt-2 border-t border-[#2B2C33]' : ''}>
                {navigationMode === 'DUAL_ROLE' && (
                  <div className="flex items-center justify-between px-3 py-1 mb-1.5">
                    <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 text-[#CFDDC8]">
                      <ShieldCheck className="w-3 h-3" /> Client Portal
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#CFDDC8]/20 text-[#CFDDC8] font-bold">
                      ACTIVE
                    </span>
                  </div>
                )}

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
            )}
          </nav>

          {/* Ownership Footer */}
          <div className="pt-2.5 border-t border-[#2B2C33] mt-2 px-1 text-center shrink-0">
            <p className="text-[10px] text-[#8E9297] font-medium leading-tight">
              © {new Date().getFullYear()} Wealthra™
            </p>
            <p className="text-[9px] text-[#F5C869] font-bold mt-0.5 tracking-wide uppercase">
              Right to this project is owned by DEVRATOR
            </p>
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
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${isClientView
                ? 'bg-[#CFDDC8]/30 border-[#B8CEB0] text-emerald-900'
                : 'bg-[#F5C869]/20 border-[#E5B550] text-[#1C1D22]'
                }`}
            >
              {isClientView ? 'Wealthra Client Portal' : 'Wealthra Business Workspace'}
            </span>
            <span className="text-xs text-[#8E9297] hidden sm:inline">
              {isClientView
                ? 'Reviewing received invoices & vendor payments'
                : 'Managing enterprise billing, receivables & operations'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* User Info */}
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-[#1C1D22] leading-tight">{user?.fullName || user?.name}</p>
              <p className="text-[10px] text-[#8E9297]">
                {navigationMode === 'DUAL_ROLE'
                  ? 'Business Owner & Client'
                  : user?.accountCategory === 'BUSINESS'
                    ? 'Verified Business Owner'
                    : 'Verified Client'}
              </p>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotificationDrawer(true)}
              className="relative p-2 rounded-xl bg-white border border-[#E8E4DC] text-[#1C1D22] hover:bg-[#FAF8F5] transition shadow-xs flex items-center justify-center cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[#1C1D22]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black min-w-4 text-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 px-3 rounded-xl bg-white border border-[#E8E4DC] text-[#8E9297] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition shadow-xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
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

