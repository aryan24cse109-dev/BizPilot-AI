import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dashboardApi } from '../api/dashboard.api.js';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import {
  FileText,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  Bot,
  ArrowUpRight,
  ExternalLink,
  Users,
  Calendar,
  Sparkles,
  ArrowDownLeft,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace, activeRole } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartView, setChartView] = useState('monthly'); // 'monthly' or 'clients'

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeRole === 'business') {
        const res = await dashboardApi.getBusinessDashboard();
        if (res.success) setData(res.data);
      } else {
        const res = await dashboardApi.getClientDashboard();
        if (res.success) setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Error fetching dashboard data.');
      toast.error('Sync Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeRole, activeWorkspace?.id]);

  if (loading) return <LoadingSpinner size="lg" text="Syncing real-time financial ledger..." />;

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 max-w-xl mx-auto mt-10">
        <p className="font-semibold">Unable to load dashboard records</p>
        <p className="text-xs mt-1 text-slate-400">{error}</p>
        <Button size="sm" variant="secondary" className="mt-4" onClick={fetchDashboard}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-charcoal-900 border border-slate-700/80 rounded-xl shadow-xl text-xs font-mono">
          <p className="font-bold text-slate-200">{label}</p>
          <p className="text-emerald-400 font-bold mt-1">
            Revenue: ₹{Number(payload[0].value).toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {activeRole === 'business' ? (
              <>
                <span>{activeWorkspace?.name || 'Business'} Control Center</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Financial Ledger Active
                </span>
              </>
            ) : (
              <>
                <span>Client Financial Portal</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold">
                  Outgoing Payments
                </span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ledger data synchronized directly with PostgreSQL 18
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeRole === 'business' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={Bot}
                onClick={() => navigate('/ai')}
              >
                AI Assistant
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => navigate('/invoices?create=true')}
              >
                New Invoice
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={CreditCard}
              onClick={() => navigate('/invoices')}
            >
              View Invoices to Pay
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {activeRole === 'business' ? 'Total Invoiced Volume' : 'Total Billed Amount'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-xl md:text-2xl font-black text-white mt-3">
            ₹{Number(metrics.totalInvoiced || 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Authoritative ledger verified</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {activeRole === 'business' ? 'Total Collected Revenue' : 'Total Paid Out'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-xl md:text-2xl font-black text-emerald-400 mt-3">
            ₹{Number(metrics.totalCollected || metrics.totalPaid || 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>{metrics.paidCount || 0} settlements finalized</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-amber-500/30 transition shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {activeRole === 'business' ? 'Pending Receivables' : 'Pending Payments'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-xl md:text-2xl font-black text-amber-300 mt-3">
            ₹{Number(metrics.totalPending || 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 mt-2">
            <span>{metrics.pendingCount || 0} invoices awaiting settlement</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-rose-500/30 transition shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Overdue Amount</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-xl md:text-2xl font-black text-rose-400 mt-3">
            ₹{Number(metrics.totalOverdue || 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-400/90 mt-2">
            <span>{metrics.overdueCount || 0} invoices past due date</span>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column (2 spans) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Monthly Cash Inflow & Collections
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Authoritative monthly revenue trajectory</p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              Full Intelligence <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-4">
            {data?.monthlyCollections && data.monthlyCollections.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyCollections}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232b3e" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No monthly collection records yet.
              </div>
            )}
          </div>
        </div>

        {/* AI Quick Prompts Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">BizPilot AI Operator</h3>
              <p className="text-[11px] text-slate-400">1-Click Voice & Text Assistant</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Issue invoices, analyze overdue receivables, or query month-to-date cashflow via English, Hindi, or Hinglish:
          </p>

          <div className="space-y-2">
            {[
              'Rahul ke liye 15000 ka invoice banao for website development',
              'How much money did I collect this month?',
              'Show my pending invoices',
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => navigate('/ai')}
                className="w-full text-left p-2.5 rounded-xl bg-charcoal-950/80 hover:bg-emerald-500/10 text-xs text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between"
              >
                <span className="truncate pr-2">"{prompt}"</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            icon={Bot}
            onClick={() => navigate('/ai')}
          >
            Launch Voice Assistant
          </Button>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Recent Invoicing Transactions
          </h3>
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            View All Invoices →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-charcoal-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">{activeRole === 'business' ? 'Client' : 'Issuer'}</th>
                <th className="py-3 px-4 font-semibold">Issue Date</th>
                <th className="py-3 px-4 font-semibold">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Balance Due</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(data?.recentInvoices || []).map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="hover:bg-charcoal-800/30 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    {activeRole === 'business' ? (inv.client?.name || 'Client') : (inv.workspace?.name || 'TechNova Solutions')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(inv.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-100">
                    ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                    {Number(inv.balanceDue) > 0 ? (
                      <span className="text-amber-400">₹{Number(inv.balanceDue).toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-emerald-400">₹0 (Paid)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={inv.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/invoices/${inv.id}`);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
