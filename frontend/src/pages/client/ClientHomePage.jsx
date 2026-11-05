import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardApi } from '../../api/dashboard.api.js';
import { invoicesApi } from '../../api/invoices.api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import {
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Download
} from 'lucide-react';

export const ClientHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, invRes] = await Promise.all([
          dashboardApi.getClientDashboard(),
          invoicesApi.listClientInvoices({ limit: 5 }),
        ]);
        if (dashRes?.data) setDashboardData(dashRes.data);
        const invList = invRes?.data?.invoices || invRes?.invoices || [];
        setInvoices(invList);
      } catch (err) {
        console.error('Error loading client home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Loading client financial overview..." />;

  const metrics = dashboardData?.metrics || {};
  const financial = metrics.financial || {};
  const totalOutstanding = Number(financial.totalOutstandingAmount || metrics.totalPending || 0);
  const totalPaid = Number(financial.totalCapturedAmount || metrics.totalPaid || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user?.name || 'Valued Client'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review incoming invoices, settle balances securely, and communicate with your vendors.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={MessageSquare}
          onClick={() => navigate('/portal/messages')}
        >
          Contact Vendors
        </Button>
      </div>

      {/* Main Prominent Financial Card (Section 8.1) */}
      <div className="saas-card p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-surface-light dark:via-charcoal-900 to-surface-light dark:to-surface-dark border border-emerald-500/30 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-emerald-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-primary animate-pulse" />
              Total Outstanding Balance
            </span>
            <div className="font-mono text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {metrics.pendingCount || 0} active invoice(s) awaiting payment across connected businesses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {totalOutstanding > 0 ? (
              <Button
                variant="primary"
                size="lg"
                icon={CreditCard}
                onClick={() => navigate('/portal/invoices')}
                className="shadow-md shadow-emerald-500/20"
              >
                Pay Outstanding (₹{totalOutstanding.toLocaleString('en-IN')})
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-primary text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" /> All invoices are settled!
              </div>
            )}
          </div>
        </div>

        {/* 3 Secondary Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Settled (Lifetime)</span>
            <p className="font-mono text-lg font-bold text-emerald-primary mt-1">
              ₹{totalPaid.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Active Invoices</span>
            <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {metrics.pendingCount || 0} Pending
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Verified Settlements</span>
            <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {metrics.paidCount || 0} Transactions
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Invoices Awaiting Payment & Connected Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent / Upcoming Invoices (2 spans) */}
        <div className="saas-card p-6 border border-slate-200 dark:border-slate-800 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-primary" />
              Recent Invoices Awaiting Action
            </h3>
            <button
              onClick={() => navigate('/portal/invoices')}
              className="text-xs text-emerald-primary hover:underline font-semibold flex items-center gap-1"
            >
              View all ({invoices.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.slice(0, 4).map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-primary/40 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-primary flex items-center justify-center font-bold text-xs">
                      INV
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Issuer: {inv.workspace?.name || 'TechNova Solutions'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      ₹{Number(inv.balanceDue || inv.totalAmount).toLocaleString('en-IN')}
                    </p>
                    <div className="mt-1">
                      <Badge status={inv.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No pending invoices found.
            </div>
          )}
        </div>

        {/* Right Column: Connected Businesses (1 span) */}
        <div className="saas-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connected Businesses</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vendors authorized to issue digital tax invoices to your account:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-charcoal-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                  TN
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">TechNova Solutions</p>
                  <p className="text-[10px] text-slate-400">Bengaluru, India</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-primary border border-emerald-500/20 font-semibold">
                ACTIVE
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            icon={MessageSquare}
            onClick={() => navigate('/portal/messages')}
          >
            Open Client Messages
          </Button>
        </div>
      </div>
    </div>
  );
};
