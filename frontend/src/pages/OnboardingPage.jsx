import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Building2, User, Check, ArrowRight, ShieldCheck, Briefcase } from 'lucide-react';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, setActiveRole } = useAuth();
  const toast = useToast();

  const [roleChoice, setRoleChoice] = useState('business'); // 'business' or 'client'
  const [businessStructure, setBusinessStructure] = useState('Agency');
  const [businessName, setBusinessName] = useState(user?.activeWorkspace?.name || 'TechNova Solutions');
  const [taxId, setTaxId] = useState('29ABCDE1234F1Z5');
  const [currency, setCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setActiveRole(roleChoice);
      localStorage.setItem('bizpilot_active_role', roleChoice);
      toast.success('Workspace Configured', `Welcome to BizPilot as a ${roleChoice === 'business' ? 'Business Owner' : 'Client'}!`);
      setSubmitting(false);
      navigate(roleChoice === 'business' ? '/business' : '/portal');
    }, 600);
  };

  return (
    <div className="saas-card p-8 shadow-2xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account & Profile Setup</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Select how you primarily intend to use BizPilot AI. You can switch anytime.
        </p>
      </div>

      <form onSubmit={handleComplete} className="space-y-6">
        {/* Role Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => setRoleChoice('business')}
            className={`p-4 rounded-2xl border cursor-pointer transition select-none flex flex-col justify-between ${
              roleChoice === 'business'
                ? 'border-emerald-primary bg-emerald-500/10 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-emerald-primary/20 text-emerald-primary flex items-center justify-center font-bold mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Business Owner</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Issue invoices, track cashflow & manage clients.
              </p>
            </div>
            {roleChoice === 'business' && (
              <span className="text-[10px] text-emerald-primary font-bold flex items-center gap-1 mt-2">
                <Check className="w-3 h-3" /> Selected
              </span>
            )}
          </div>

          <div
            onClick={() => setRoleChoice('client')}
            className={`p-4 rounded-2xl border cursor-pointer transition select-none flex flex-col justify-between ${
              roleChoice === 'client'
                ? 'border-emerald-primary bg-emerald-500/10 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-2">
                <User className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Client Mode</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Receive invoices, make settlements & collaborate.
              </p>
            </div>
            {roleChoice === 'client' && (
              <span className="text-[10px] text-emerald-primary font-bold flex items-center gap-1 mt-2">
                <Check className="w-3 h-3" /> Selected
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Fields */}
        {roleChoice === 'business' ? (
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Input
              label="Business Legal Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Tech Solutions Pvt Ltd"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Business Structure
                </label>
                <select
                  value={businessStructure}
                  onChange={(e) => setBusinessStructure(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-charcoal-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-primary"
                >
                  <option value="Freelancer">Freelancer</option>
                  <option value="Agency">Digital Agency</option>
                  <option value="Startup">Tech Startup</option>
                  <option value="Small Business">Small Business</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Base Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-charcoal-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-primary"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <Input
              label="Tax ID / GSTIN"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="29ABCDE1234F1Z5"
            />
          </div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              As a client, your dashboard will display incoming invoices, verified payment records, and direct messaging with connected businesses.
            </p>
          </div>
        )}

        <Button type="submit" variant="primary" size="md" className="w-full" loading={submitting} icon={ArrowRight}>
          Complete Onboarding
        </Button>
      </form>
    </div>
  );
};
