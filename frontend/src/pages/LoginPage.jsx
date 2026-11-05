import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [emailOrUsername, setEmailOrUsername] = useState('business@wealthra.com');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleGoogleSignIn = () => {
    toast.info('Google Sign-In Initiated', 'Connecting with Google OAuth 2.0 gateway...');
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
    <div className="saas-card p-6 sm:p-8 rounded-2xl shadow-xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to your account</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Welcome back. Enter your credentials to access your financial operations.
        </p>
      </div>

      {/* Demo Credentials Helper */}
      <div className="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 text-xs">
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-primary" />
          Quick Test Accounts (Verified Database Seeds)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemoAccount('business')}
            className="p-2 rounded-lg bg-white dark:bg-charcoal-800 border border-slate-200 dark:border-slate-700/60 text-left transition hover:border-[#1C1D22] flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="font-bold text-[#1C1D22] dark:text-white text-xs">Business Owner</p>
              <p className="text-[10px] text-slate-500 font-mono">business@wealthra.com</p>
            </div>
            <UserCheck className="w-3.5 h-3.5 text-amber-500" />
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('client')}
            className="p-2 rounded-lg bg-white dark:bg-charcoal-800 border border-slate-200 dark:border-slate-700/60 text-left transition hover:border-[#1C1D22] flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="font-bold text-[#1C1D22] dark:text-white text-xs">Client Account</p>
              <p className="text-[10px] text-slate-500 font-mono">client@wealthra.com</p>
            </div>
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
          </button>
        </div>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-charcoal-800 hover:bg-slate-50 dark:hover:bg-charcoal-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs mb-4"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
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

      <div className="flex items-center my-4">
        <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
        <span className="px-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Or with email</span>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between mb-1.5">
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
          size="lg"
          loading={loading}
          className="w-full mt-2"
          icon={ArrowRight}
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-emerald-primary hover:underline font-bold">
          Create New Account
        </Link>
      </div>
    </div>
  );
};
