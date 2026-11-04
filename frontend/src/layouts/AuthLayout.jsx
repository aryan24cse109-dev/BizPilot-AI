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
          <div className="w-8 h-8 rounded-xl bg-emerald-primary flex items-center justify-center text-white font-black shadow-md shadow-emerald-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            BizPilot <span className="text-emerald-primary">AI</span>
          </span>
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
        &copy; {new Date().getFullYear()} BizPilot AI Inc. Authoritative Business Invoicing & Settlement Platform.
      </footer>
    </div>
  );
};
