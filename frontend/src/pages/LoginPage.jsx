import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  Check,
  X
} from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [emailOrUsername, setEmailOrUsername] = useState('business@wealthra.com');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google OAuth Role Selection Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleRole, setGoogleRole] = useState('BUSINESS'); // 'BUSINESS' or 'CLIENT'
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(emailOrUsername, password);
      toast.success('Signed In', `Welcome back, ${user.name}!`);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
      toast.error('Authentication Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    setGoogleLoading(true);
    try {
      const defaultEmail = googleRole === 'BUSINESS' ? 'google.business@wealthra.com' : 'google.client@wealthra.com';
      const emailToUse = (googleEmail.trim() || defaultEmail).toLowerCase();
      
      const user = await login(emailToUse, 'GoogleOAuthPassword123', googleRole);
      toast.success(
        'Google Registration Completed',
        `Authenticated as ${googleRole === 'BUSINESS' ? 'Business Owner' : 'Client Account'}`
      );
      setShowGoogleModal(false);
      navigate('/');
    } catch (err) {
      toast.error('Google Sign-In Error', err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillDemoAccount = (role) => {
    if (role === 'business') {
      setEmailOrUsername('business@wealthra.com');
      setPassword('Password@123');
      toast.info('Account Selected', 'Business Owner Credentials');
    } else {
      setEmailOrUsername('client@wealthra.com');
      setPassword('Password@123');
      toast.info('Account Selected', 'Client Account Credentials');
    }
  };

  return (
    <>
      <div className="saas-card p-5 sm:p-6 rounded-2xl shadow-xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800">
        {/* Centered Brand Logo (in high-contrast dark capsule) */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center justify-center px-6 py-2 rounded-2xl bg-[#1C1D22] border border-[#2B2C33] shadow-md">
            <img
              src="/wealthra-logo.png"
              alt="Wealthra"
              className="h-8 w-auto max-w-[180px] object-contain"
            />
          </div>
        </div>

        {/* Header */}
        <div className="mb-3 text-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sign in to your account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enter your credentials to access your financial operations.
          </p>
        </div>

        {/* Compact Demo Credentials Selector */}
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-charcoal-900/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 pl-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-primary shrink-0" />
            <span className="hidden sm:inline">Demo Credentials:</span>
            <span className="sm:hidden">Demo:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fillDemoAccount('business')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition ${
                emailOrUsername === 'business@wealthra.com'
                  ? 'bg-[#1C1D22] text-white shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              Business
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('client')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition ${
                emailOrUsername === 'client@wealthra.com'
                  ? 'bg-[#1C1D22] text-white shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              Client
            </button>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => {
            setGoogleEmail('');
            setGoogleRole('BUSINESS');
            setShowGoogleModal(true);
          }}
          className="w-full flex items-center justify-center gap-2.5 py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-charcoal-800 hover:bg-slate-50 dark:hover:bg-charcoal-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center my-3">
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
          <span className="px-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Or with credentials</span>
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Email Address or Username"
            type="text"
            icon={Mail}
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="name@company.com"
            required
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-emerald-primary hover:underline font-semibold">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full mt-1"
            icon={ArrowRight}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-primary hover:underline font-bold">
            Create New Account
          </Link>
        </div>
      </div>

      {/* Google Role Selection Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Register with Google
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you registering as a Business Owner or a Client?
                </p>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-charcoal-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Business Option */}
              <button
                type="button"
                onClick={() => setGoogleRole('BUSINESS')}
                className={`p-3.5 rounded-2xl border text-left transition select-none flex flex-col justify-between ${
                  googleRole === 'BUSINESS'
                    ? 'border-[#1C1D22] dark:border-emerald-500 bg-slate-50 dark:bg-emerald-500/10 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-2">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Business Owner</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Issue invoices, manage clients, AI operator & receive payments.
                  </p>
                </div>
                {googleRole === 'BUSINESS' && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-2.5">
                    <Check className="w-3.5 h-3.5" /> Selected
                  </span>
                )}
              </button>

              {/* Client Option */}
              <button
                type="button"
                onClick={() => setGoogleRole('CLIENT')}
                className={`p-3.5 rounded-2xl border text-left transition select-none flex flex-col justify-between ${
                  googleRole === 'CLIENT'
                    ? 'border-[#1C1D22] dark:border-emerald-500 bg-slate-50 dark:bg-emerald-500/10 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center mb-2">
                    <User className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Client Account</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Receive tax invoices, make payments & message issuing vendors.
                  </p>
                </div>
                {googleRole === 'CLIENT' && (
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-2.5">
                    <Check className="w-3.5 h-3.5" /> Selected
                  </span>
                )}
              </button>
            </div>

            {/* Google Email Confirmation */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Account Email
              </label>
              <input
                type="email"
                placeholder={googleRole === 'BUSINESS' ? 'your.name@gmail.com' : 'client.account@gmail.com'}
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-charcoal-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Your new account will be created under this email with role-based access.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGoogleModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={googleLoading}
                onClick={handleGoogleAuthSubmit}
              >
                Register & Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;
