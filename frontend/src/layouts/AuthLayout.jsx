import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Zap, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export const AuthLayout = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Simple Header */}
      <div className="p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Link to="/login" className="flex items-center gap-2.5">
          <img src="/wealthra-logo.png" alt="Wealthra" className="h-8 w-auto max-w-[160px] object-contain" />
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-primary" />
          <span>Enterprise 256-bit Encryption</span>
        </div>
      </div>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        &copy; {new Date().getFullYear()} Wealthra™ Inc. Authoritative Business Invoicing & Settlement Platform.
      </footer>
    </div>
  );
};
