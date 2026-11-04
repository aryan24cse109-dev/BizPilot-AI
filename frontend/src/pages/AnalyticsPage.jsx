import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardApi } from '../api/dashboard.api.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import {
  TrendingUp,
  Clock,
  Users,
  Sparkles,
  BarChart3,
  Calendar,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export const AnalyticsPage = () => {
  const { activeWorkspace } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await dashboardApi.getBusinessIntelligence();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error('Failed to load BI analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [activeWorkspace?.id]);

  if (loading) return <LoadingSpinner size="lg" text="Analyzing PostgreSQL financial records..." />;

  const agingColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          Financial Intelligence & Collection Insights
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Algorithmic analytics calculated strictly from verified database records
        </p>
      </div>

      {/* Forecasting Banner */}
      {data?.forecasting && (
        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-charcoal-900 to-teal-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Historical Collection Forecast
              </span>
            </div>
            <h3 className="text-lg font-black text-white">
              Projected Next Month Cashflow: <span className="text-emerald-400 font-mono">₹{data.forecasting.projectedNextMonth.toLocaleString('en-IN')}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {data.forecasting.basis} Average monthly run rate is ₹{data.forecasting.lastThreeMonthAverage.toLocaleString('en-IN')}.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-charcoal-950/80 border border-slate-800 text-xs shrink-0 font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">90-Day Verified Avg</span>
            <span className="text-lg font-bold text-slate-100">
              ₹{data.forecasting.lastThreeMonthAverage.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* 2-Column Grid: Aging & Client-wise Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Analysis Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Accounts Receivable Aging Analysis
              </h3>
              <p className="text-xs text-slate-400">Aging brackets of unpaid balances</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.agingAnalysis || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232b3e" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#10141d',
                    borderColor: '#343f56',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Outstanding']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {(data?.agingAnalysis || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={agingColors[index % agingColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client-wise Revenue Breakdown */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Client-wise Revenue Share
                </h3>
                <p className="text-xs text-slate-400">Total settled revenue per client relationship</p>
              </div>
            </div>

            <div className="space-y-3">
              {(data?.clientRevenue || []).length > 0 ? (
                data.clientRevenue.map((cr, idx) => (
                  <div key={cr.clientId || idx} className="p-3 rounded-xl bg-charcoal-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{cr.clientName}</p>
                      <p className="text-[10px] text-slate-400">{cr.paymentsCount} payments settled</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ₹{Number(cr.revenue).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-8">
                  No verified client transactions settled yet.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Figures reflect 100% verified provider transactions.
          </div>
        </div>
      </div>
    </div>
  );
};
