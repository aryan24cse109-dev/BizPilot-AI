import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    // Simulation / integration endpoint
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('Reset Instructions Dispatched', `Password recovery link sent to ${email}`);
    }, 800);
  };

  return (
    <div className="saas-card p-6 sm:p-8 shadow-xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800">
      {/* Centered Brand Logo (in high-contrast dark capsule) */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center justify-center px-6 py-2 rounded-2xl bg-[#1C1D22] border border-[#2B2C33] shadow-md">
          <img
            src="/wealthra-logo.png"
            alt="Wealthra"
            className="h-8 w-auto max-w-[180px] object-contain"
          />
        </div>
      </div>

      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recover your credentials</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enter your registered email address and we will dispatch a secure reset token.
        </p>
      </div>

      {submitted ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-primary flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Check your inbox
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            We have sent password recovery instructions to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-primary font-bold hover:underline pt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            icon={Mail}
          />

          <Button type="submit" variant="primary" size="md" className="w-full" loading={submitting}>
            Send Recovery Link
          </Button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-primary transition flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
