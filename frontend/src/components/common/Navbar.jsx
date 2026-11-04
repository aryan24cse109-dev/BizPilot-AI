import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  Building2, 
  ChevronDown, 
  User, 
  LogOut, 
  ArrowLeftRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export const Navbar = () => {
  const { user, activeWorkspace, activeRole, toggleRole, switchWorkspace, logout } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const allWorkspaces = [
    ...(user?.workspacesOwned || []),
    ...(user?.workspaceMembers?.map(m => m.workspace) || [])
  ];

  return (
    <header className="h-16 border-b border-slate-800/80 bg-charcoal-900/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Left: Active Workspace Selector */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-charcoal-800/90 border border-slate-700/60 hover:border-emerald-500/40 text-left transition"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 leading-tight">
                {activeWorkspace?.name || 'Default Workspace'}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium">
                {activeWorkspace?.currency || 'INR'} • Active Business
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showWorkspaceMenu && (
            <div 
              className="absolute left-0 mt-2 w-64 bg-charcoal-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
              onMouseLeave={() => setShowWorkspaceMenu(false)}
            >
              <p className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
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
                    activeWorkspace?.id === ws.id ? 'bg-emerald-500/15 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-charcoal-800'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {activeWorkspace?.id === ws.id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Role Switcher & User Profile */}
      <div className="flex items-center gap-3">
        {/* Dual-Side Role Switcher Toggle */}
        <button
          onClick={toggleRole}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition shadow-sm ${
            activeRole === 'business'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-500/20'
          }`}
          title="Toggle between Business (Issuer) and Client (Payer) perspective"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-current animate-pulse" />
          <span>Viewing as: <strong>{activeRole === 'business' ? 'Business Owner' : 'Client Mode'}</strong></span>
        </button>

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-charcoal-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-semibold text-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BP'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-200">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400">@{user?.username || 'member'}</p>
            </div>
          </button>

          {showUserMenu && (
            <div 
              className="absolute right-0 mt-2 w-52 bg-charcoal-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in"
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div className="px-3 py-2 border-b border-slate-800 text-xs">
                <p className="font-semibold text-slate-200">{user?.name}</p>
                <p className="text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition text-left"
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
  );
};
