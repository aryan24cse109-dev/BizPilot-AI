import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Zap, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export const AuthLayout = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="h-screen w-full flex flex-col justify-between bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-hidden">

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-0 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-2 text-center text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
        &copy; {new Date().getFullYear()} Wealthra™. All rights to this project are owned by <span className="font-bold text-slate-700 dark:text-slate-200">DEVRATOR</span>.
      </footer>
    </div>
  );
};
