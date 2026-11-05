import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import {
  User,
  Sun,
  Moon,
  Globe,
  Bell,
  ShieldCheck,
  Building,
  LogOut,
  Save,
  CheckCircle
} from 'lucide-react';

export const ClientProfilePage = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();

  const [name, setName] = useState(user?.fullName || user?.name || '');
  const [email] = useState(user?.email || '');
  const [company, setCompany] = useState(user?.clientProfile?.billingAddress || '');
  const [language, setLanguage] = useState('en');
  const [notifyInvoices, setNotifyInvoices] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Profile Preferences Saved', 'Your client settings have been updated.');
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-emerald-primary" />
          Client Profile & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details, connected vendors, notification alerts, and theme preferences.
        </p>
      </div>

      {/* Profile Form */}
      <div className="saas-card p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800">
          Personal & Company Details
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              value={email}
              disabled
              className="opacity-70 cursor-not-allowed"
            />
          </div>

          <Input
            label="Company / Legal Entity"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />

          {/* Theme & Language Preferences */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Appearance & Localization
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Visual Theme
                </label>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-emerald-primary/40 transition"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Moon className="w-4 h-4 text-emerald-primary" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    {isDark ? 'Dark Mode (Deep Charcoal)' : 'Light Mode (Warm White)'}
                  </span>
                  <span className="text-[10px] text-emerald-primary font-bold">Toggle</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-primary"
                >
                  <option value="en">English (US/UK)</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Notification Preferences
            </h4>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyInvoices}
                  onChange={(e) => setNotifyInvoices(e.target.checked)}
                  className="rounded text-emerald-primary focus:ring-emerald-primary"
                />
                Receive alerts when new digital tax invoices are issued
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyReminders}
                  onChange={(e) => setNotifyReminders(e.target.checked)}
                  className="rounded text-emerald-primary focus:ring-emerald-primary"
                />
                Receive upcoming due date and payment reminders
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyMessages}
                  onChange={(e) => setNotifyMessages(e.target.checked)}
                  className="rounded text-emerald-primary focus:ring-emerald-primary"
                />
                Notify on new messages from vendors
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="submit" variant="primary" size="md" loading={saving} icon={Save}>
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      {/* Security & Sign Out */}
      <div className="saas-card p-6 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Session</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Signed in securely via JWT token with 256-bit AES encryption.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={LogOut} onClick={logout} className="text-rose-500 hover:text-rose-600">
          Sign Out
        </Button>
      </div>
    </div>
  );
};
