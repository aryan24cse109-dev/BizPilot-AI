import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('business@bizpilot.ai');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(emailOrUsername, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (role) => {
    if (role === 'business') {
      setEmailOrUsername('business@bizpilot.ai');
      setPassword('Password@123');
    } else {
      setEmailOrUsername('rahul@rahulenterprises.com');
      setPassword('Password@123');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-charcoal-950 font-black shadow-lg shadow-emerald-500/25 mb-3">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign in to <span className="text-emerald-400">BizPilot AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous Business Invoicing & Financial Operations
          </p>
        </div>

        {/* Demo Quick-Fill Buttons */}
        <div className="mb-6 p-3 rounded-2xl bg-charcoal-900 border border-slate-800 text-xs">
          <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Quick Demo Accounts (Verified Data in PostgreSQL)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('business')}
              className="px-3 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 border border-slate-700/60 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-emerald-400">Rajesh Kumar</p>
                <p className="text-[10px] text-slate-400">Business (TechNova)</p>
              </div>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('client')}
              className="px-3 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 border border-slate-700/60 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-teal-300">Rahul Sharma</p>
                <p className="text-[10px] text-slate-400">Client (Enterprises)</p>
              </div>
              <UserCheck className="w-3.5 h-3.5 text-teal-300" />
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

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

            <Input
              label="Password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              icon={ArrowRight}
            >
              Access Business Platform
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 hover:underline font-semibold">
              Create New Business Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
