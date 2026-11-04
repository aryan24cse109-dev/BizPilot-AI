import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace, activeRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
        <p className="font-semibold">Unable to load dashboard records</p>
        <p className="text-xs mt-1 text-slate-400">{error}</p>
        <Button size="sm" variant="secondary" className="mt-4" onClick={fetchDashboard}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {activeRole === 'business' ? (
              <>
                <span>{activeWorkspace?.name || 'Business'} Dashboard</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  Financial Control Center
                </span>
              </>
            ) : (
              <>
                <span>Client Financial Portal</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium">
                  Outgoing Payments & Invoices
                </span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ledger data synchronized directly with PostgreSQL
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
                Create Invoice
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={CreditCard}
              onClick={() => navigate('/invoices')}
            >
              Review Received Invoices
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Collected / Paid */}
        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">
              {activeRole === 'business' ? 'Total Collected' : 'Total Paid Out'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-emerald-400">
            ₹{Number(activeRole === 'business' ? metrics.totalCollected : metrics.totalPaidAmount || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Verified sandbox transactions</p>
        </div>

        {/* Metric 2: Outstanding Balance */}
        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-400">
            ₹{Number(activeRole === 'business' ? metrics.totalOutstanding : metrics.totalOutstandingAmount || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {metrics.pendingInvoices || 0} pending invoices
          </p>
        </div>

        {/* Metric 3: Paid Invoices */}
        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Paid Invoices</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">
            {metrics.paidInvoices || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {metrics.partiallyPaidInvoices || 0} partially paid
          </p>
        </div>

        {/* Metric 4: Overdue Invoices */}
        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-rose-400">
            {metrics.overdueInvoices || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Requires immediate follow-up</p>
        </div>
      </div>

      {/* Main Content Area: Chart and Recent Activity */}
      {activeRole === 'business' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real Monthly Collection Chart (2 Columns) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-white">Monthly Collection Trend</h3>
                <p className="text-xs text-slate-400">Real transaction volumes from PostgreSQL</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-charcoal-800 rounded-lg text-emerald-400 border border-slate-700">
                Last 6 Months
              </span>
            </div>

            <div className="h-64 w-full">
              {data.monthlyCollections && data.monthlyCollections.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyCollections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232b3e" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#10141d',
                        borderColor: '#343f56',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                    />
                    <Bar dataKey="collected" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No historical collection data recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Connected Clients & Highlights (1 Column) */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Client Network
                </h3>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {metrics.connectedClientsCount || 1} Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Connect with clients to issue invoices, collaborate via messaging, and collect payments directly.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-charcoal-950/80 border border-slate-800">
              <p className="text-xs font-semibold text-slate-300 mb-1">AI Fast Action</p>
              <p className="text-[11px] text-slate-400 mb-3">
                "Rahul ke liye 15000 ka invoice banao for website development"
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/ai')}
              >
                Launch AI Assistant
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent Invoices Table */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              {activeRole === 'business' ? 'Recent Issued Invoices' : 'Received Invoices for Payment'}
            </h3>
            <p className="text-xs text-slate-400">Status, due dates, and outstanding balances</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="text-xs text-emerald-400"
          >
            View All Invoices
          </Button>
        </div>

        {((activeRole === 'business' ? data?.recentInvoices : data?.upcomingDeadlines) || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">{activeRole === 'business' ? 'Client' : 'Business'}</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Balance Due</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {((activeRole === 'business' ? data.recentInvoices : data.upcomingDeadlines) || []).map((inv) => (
                  <tr key={inv.id} className="hover:bg-charcoal-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {activeRole === 'business' ? inv.client?.name : inv.workspace?.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-amber-400">
                      ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6">
            No invoices recorded yet in this workspace.
          </p>
        )}
      </div>
    </div>
  );
};
