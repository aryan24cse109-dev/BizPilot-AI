import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Zap, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export const AuthLayout = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="h-screen w-full flex flex-col justify-between bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
      {/* Top Simple Header */}
      <div className="px-6 py-2.5 flex items-center justify-between max-w-6xl w-full mx-auto shrink-0">
        <Link to="/login" className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[#1C1D22] border border-[#2B2C33] shadow-xs">
          <img src="/wealthra-logo.png" alt="Wealthra" className="h-6 sm:h-7 w-auto max-w-[150px] object-contain" />
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-primary" />
          <span>Enterprise 256-bit Encryption</span>
        </div>
      </div>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-0 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-2 text-center text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
        &copy; {new Date().getFullYear()} Wealthra™ Inc. Authoritative Business Invoicing & Settlement Platform.
      </footer>
    </div>
  );
};
