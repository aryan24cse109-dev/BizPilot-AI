import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Bot,
  FileText,
  Users,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';

export const Sidebar = () => {
  const { activeRole } = useAuth();

  const businessNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Assistant', path: '/ai', icon: Bot, badge: 'AI Voice' },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Clients & Network', path: '/clients', icon: Users },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Payments & Sandbox', path: '/payments', icon: CreditCard },
    { name: 'Business Intelligence', path: '/analytics', icon: TrendingUp },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const clientNavItems = [
    { name: 'Client Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Received Invoices', path: '/invoices', icon: FileText },
    { name: 'Payment History', path: '/payments', icon: CreditCard },
    { name: 'Connected Businesses', path: '/clients', icon: Users },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const navItems = activeRole === 'business' ? businessNavItems : clientNavItems;

  return (
    <aside className="w-64 bg-charcoal-900/95 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Logo & Header */}
      <div>
        <div className="py-4 px-4 flex flex-col items-center justify-center text-center border-b border-slate-800/80">
          <img src="/wealthra-logo.png" alt="Wealthra" className="h-11 w-auto max-w-[200px] object-contain mx-auto mb-1" />
          <p className="text-[10px] text-slate-400 font-medium">Fintech Operations</p>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0 text-current" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-400 text-charcoal-950 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" />
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Sandbox Status Card */}
      <div className="p-4 m-3 rounded-2xl bg-charcoal-950 border border-slate-800 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Active Gateway
          </span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
            SANDBOX
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Razorpay & PayPal Sandbox active with verifiable test transactions.
        </p>
      </div>
    </aside>
  );
};
