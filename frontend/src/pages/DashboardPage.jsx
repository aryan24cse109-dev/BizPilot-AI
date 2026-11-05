import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardApi } from '../api/dashboard.api.js';
import {
  Search,
  ArrowUpRight,
  Sparkles,
  Share2,
  FileText,
  CreditCard,
  Percent,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, activeWorkspace } = useAuth();
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  useEffect(() => {
    const fetchAllDashboardData = async () => {
      setLoading(true);
      try {
        const [dashRes, invRes, txRes] = await Promise.all([
          dashboardApi.getDashboard({ role: 'business' }).catch(() => null),
          dashboardApi.getDashboardInvoices({ limit: 10, role: 'business' }).catch(() => null),
          dashboardApi.getDashboardTransactions({ limit: 10, role: 'business' }).catch(() => null),
        ]);

        if (dashRes?.success) setData(dashRes.data);
        if (invRes?.success && Array.isArray(invRes.data?.invoices)) setInvoices(invRes.data.invoices);
        if (txRes?.success && Array.isArray(txRes.data?.payments)) setTransactions(txRes.data.payments);
      } catch (err) {
        console.error('Failed to load live dashboard from database:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllDashboardData();
  }, [activeWorkspace?.id]);

  const financial = data?.metrics?.financial || {};
  const invoiceCounts = data?.metrics?.invoices || {};
  const paymentMetrics = data?.metrics?.payments || {};

  // Database-backed figures - NO hardcoded fallbacks
  const totalBalance = Number(financial.totalCapturedAmount || 0);
  const totalInvoiced = Number(financial.totalInvoicedAmount || 0);
  const totalOutstanding = Number(financial.totalOutstandingAmount || 0);

  // Compute 7-day volume dynamically from real database invoices
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayVolumes = [0, 0, 0, 0, 0, 0, 0];

  invoices.forEach((inv) => {
    if (inv.issueDate) {
      const d = new Date(inv.issueDate);
      const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
      dayVolumes[dayIndex] += Number(inv.totalAmount || 0);
    }
  });

  const maxVolume = Math.max(...dayVolumes, 1);
  const weeklyCapsuleData = daysOfWeek.map((day, idx) => ({
    day,
    heightPct: Math.round((dayVolumes[idx] / maxVolume) * 90) + (dayVolumes[idx] > 0 ? 10 : 0),
    filledAmount: `₹${dayVolumes[idx].toLocaleString('en-IN')}`,
    rawAmount: dayVolumes[idx],
  }));

  // Filtered lists based on search
  const filteredInvoices = invoices.filter((inv) =>
    (inv.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter((tx) =>
    (tx.invoice?.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.providerOrderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.providerPaymentId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate real collection percentage from database
  const collectionRate = totalInvoiced > 0 ? Math.round((totalBalance / totalInvoiced) * 100) : 0;
  const outstandingRate = totalInvoiced > 0 ? Math.round((totalOutstanding / totalInvoiced) * 100) : 0;
  const draftOrOtherRate = Math.max(0, 100 - collectionRate - outstandingRate);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ======================================================== */}
      {/* LEFT / CENTER MAIN COLUMN                                */}
      {/* ======================================================== */}
      <div className="flex-1 space-y-6">
        {/* Top Header Row with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1C1D22] tracking-tight">
              Financial Overview
            </h1>
            <p className="text-xs font-semibold mt-0.5 text-[#8E9297]">
              Authoritative ledger & revenue metrics from PostgreSQL
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search invoices & payments"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1C1D22] placeholder-slate-400 focus:outline-none focus:border-[#1C1D22] shadow-xs"
              style={{ borderColor: '#E8E4DC' }}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3 REAL METRIC CARDS                                      */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Captured Balance (Pastel Sage) */}
          <div
            className="rounded-3xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden h-44"
            style={{ backgroundColor: '#CFDDC8', color: '#1A3018' }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold flex items-center gap-1.5 opacity-90">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black"
                    style={{ backgroundColor: '#B8CBB2', color: '#1A3018' }}
                  >
                    ₹
                  </span>
                  Settled Volume
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full font-mono"
                  style={{ backgroundColor: '#B8CBB2', color: '#1A3018' }}
                >
                  {paymentMetrics.successfulCount || 0} Paid
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black tracking-tight font-mono" style={{ color: '#1A3018' }}>
                ₹{totalBalance.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Sparkline wave */}
            <svg className="w-full h-10 mt-auto" viewBox="0 0 200 40" fill="none">
              <path
                d="M0 30 Q 25 10, 50 25 T 100 20 T 150 35 T 200 15"
                stroke="#6B8E62"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Card 2: Total Invoiced Sales (Pastel Honey Gold) */}
          <div
            className="rounded-3xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden h-44"
            style={{ backgroundColor: '#F9DC90', color: '#3A2E12' }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold flex items-center gap-1.5 opacity-90">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ backgroundColor: '#ECCB6F', color: '#3A2E12' }}
                  >
                    #
                  </span>
                  Total Invoiced
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full font-mono"
                  style={{ backgroundColor: '#ECCB6F', color: '#3A2E12' }}
                >
                  {invoiceCounts.total || 0} Invoices
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black tracking-tight font-mono" style={{ color: '#3A2E12' }}>
                ₹{totalInvoiced.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Sparkline wave */}
            <svg className="w-full h-10 mt-auto" viewBox="0 0 200 40" fill="none">
              <path
                d="M0 25 Q 30 35, 60 15 T 120 30 T 160 10 T 200 22"
                stroke="#C49B30"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Card 3: Receivables / Outstanding (Pastel Lavender) */}
          <div
            className="rounded-3xl p-5 flex flex-col justify-between shadow-xs h-44"
            style={{ backgroundColor: '#8E9EF8', color: '#FFFFFF' }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold flex items-center gap-1.5 text-white/90">
                  <Clock className="w-3.5 h-3.5" /> Receivables
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  {invoiceCounts.sent || 0} Pending
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black tracking-tight font-mono text-white">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </p>
            </div>

            <button
              onClick={() => navigate('/business/invoices?create=true')}
              className="w-full py-2 px-4 rounded-xl text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: '#5D6FE8' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4A5CD6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5D6FE8')}
            >
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DYNAMIC CAPSULE BAR CHART: Volume in Last Week           */}
        {/* ======================================================== */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold block text-[#8E9297]">
                Weekly Invoiced Distribution
              </span>
              <p className="text-xl font-black text-[#1C1D22] tracking-tight mt-0.5 font-mono">
                {weeklyCapsuleData[activeDayIndex].filledAmount} on {weeklyCapsuleData[activeDayIndex].day}
              </p>
            </div>
            <button
              onClick={() => navigate('/business/invoices')}
              className="text-xs font-bold text-[#1C1D22] hover:underline cursor-pointer"
            >
              View Invoices
            </button>
          </div>

          {/* Capsule Tracks Row */}
          <div className="flex items-end justify-between gap-3 sm:gap-6 px-2 sm:px-6 pt-10 pb-2">
            {weeklyCapsuleData.map((item, idx) => {
              const isSelected = activeDayIndex === idx;

              return (
                <div
                  key={item.day}
                  onClick={() => setActiveDayIndex(idx)}
                  className="flex flex-col items-center gap-3 cursor-pointer group flex-1 relative"
                >
                  {/* Floating Tooltip Pill on Active Item */}
                  {isSelected && (
                    <div className="absolute -top-10 flex flex-col items-center z-10 animate-in fade-in">
                      <div
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md whitespace-nowrap border"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E8E4DC',
                          color: '#1C1D22',
                        }}
                      >
                        {item.filledAmount}
                      </div>
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-0.5 border"
                        style={{ backgroundColor: '#1C1D22', borderColor: '#FFFFFF' }}
                      />
                    </div>
                  )}

                  {/* Vertical Dotted Guide Line for selected bar */}
                  {isSelected && (
                    <div
                      className="absolute -top-3 bottom-8 w-px border-l border-dashed pointer-events-none"
                      style={{ borderColor: '#8E9297' }}
                    />
                  )}

                  {/* The Capsule Pill Track */}
                  <div
                    className="w-full max-w-[46px] h-36 rounded-full flex flex-col justify-end p-1 transition-all"
                    style={{ backgroundColor: '#ECE7DD' }}
                  >
                    {/* Filled Bar inside Track */}
                    <div
                      className="w-full rounded-full transition-all duration-300"
                      style={{
                        height: `${Math.max(item.heightPct, 6)}%`,
                        backgroundColor: isSelected ? '#1C1D22' : '#8E9297',
                      }}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className="text-xs font-bold transition-colors"
                    style={{
                      color: isSelected ? '#1C1D22' : '#8E9297',
                    }}
                  >
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* AUTHORITATIVE DATABASE INVOICES TABLE                     */}
        {/* ======================================================== */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-black text-[#1C1D22] tracking-tight">
                  Recent Invoices
                </h3>
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#8E9297] border border-[#E8E4DC]"
                >
                  PostgreSQL Realtime
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/business/invoices')}
              className="text-xs font-bold text-[#1C1D22] hover:underline self-start sm:self-auto cursor-pointer"
            >
              View All Invoices
            </button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            {filteredInvoices.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#F0ECE4' }}>
                    <th className="pb-3 font-bold text-[#8E9297]">Client</th>
                    <th className="pb-3 font-bold text-[#8E9297]">Invoice #</th>
                    <th className="pb-3 font-bold text-[#8E9297]">Total</th>
                    <th className="pb-3 font-bold text-[#8E9297]">Status</th>
                    <th className="pb-3 font-bold text-right text-[#8E9297]">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#F5F2EA' }}>
                  {filteredInvoices.map((inv) => {
                    const isPaid = inv.status === 'PAID';
                    const isDraft = inv.status === 'DRAFT';

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/business/invoices/${inv.id}`)}
                        className="hover:bg-[#FAF8F5] transition cursor-pointer"
                      >
                        <td className="py-3.5">
                          <span className="font-bold text-[#1C1D22] block">
                            {inv.clientName || 'Unregistered Client'}
                          </span>
                          <span className="text-[11px] text-[#8E9297] font-mono">
                            {inv.clientEmail}
                          </span>
                        </td>

                        <td className="py-3.5 font-mono text-[#8E9297] font-semibold">
                          {inv.invoiceNumber}
                        </td>

                        <td className="py-3.5 font-bold font-mono text-[#1C1D22]">
                          ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isDraft
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>

                        <td className="py-3.5 text-right font-medium text-[#8E9297] font-mono">
                          {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-IN') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 text-[#8E9297] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#1C1D22]">No invoices found in database</p>
                <p className="text-[11px] text-[#8E9297] mt-0.5">Issue an invoice to begin recording business receivables</p>
                <button
                  onClick={() => navigate('/business/invoices?create=true')}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#1C1D22] text-white text-xs font-bold hover:bg-black transition cursor-pointer"
                >
                  Create Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT SIDEBAR (320px)                                    */}
      {/* ======================================================== */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Revenue Breakdown Card */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-base font-black text-[#1C1D22] tracking-tight">
                Collection Ratio
              </h3>
              <p className="text-xs font-semibold mt-0.5 text-[#8E9297]">
                Live settlement proportion
              </p>
            </div>
            <button
              onClick={() => navigate('/business/analytics')}
              className="p-1.5 rounded-xl hover:bg-slate-50 transition text-[#8E9297] cursor-pointer"
              title="View Analytics"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Donut Chart with Centered Total */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#FAF8F5"
                  strokeWidth="10"
                />

                {/* Segment 1: Paid (Sage) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#CFDDC8"
                  strokeWidth="10"
                  strokeDasharray={`${Math.max(1, (collectionRate / 100) * 238)} 238`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />

                {/* Segment 2: Outstanding (Gold) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F9DC90"
                  strokeWidth="10"
                  strokeDasharray={`${Math.max(1, (outstandingRate / 100) * 238)} 238`}
                  strokeDashoffset={`-${(collectionRate / 100) * 238}`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Centered Total Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-[#8E9297]">
                  Settled
                </span>
                <span className="text-xl font-black text-[#1C1D22] tracking-tight font-mono">
                  {collectionRate}%
                </span>
              </div>
            </div>

            {/* Legend Stats */}
            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#CFDDC8' }} />
                  <span className="font-semibold text-[#8E9297]">Settled / Paid</span>
                </div>
                <span className="font-black text-[#1C1D22] font-mono">₹{totalBalance.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F9DC90' }} />
                  <span className="font-semibold text-[#8E9297]">Outstanding</span>
                </div>
                <span className="font-black text-[#1C1D22] font-mono">₹{totalOutstanding.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Database Transactions List */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-[#1C1D22] tracking-tight">
              Settlements
            </h3>
            <button
              onClick={() => navigate('/business/payments')}
              className="text-xs font-semibold text-[#8E9297] hover:underline cursor-pointer"
            >
              See All
            </button>
          </div>

          <div className="space-y-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-[#FAF8F5] last:border-none">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-[#1C1D22]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1C1D22] leading-tight truncate">
                        {tx.invoice?.clientName || 'Client Payment'}
                      </p>
                      <p className="text-[10px] font-mono text-[#8E9297] mt-0.5 truncate">
                        {tx.providerPaymentId || tx.providerOrderId || 'Settled'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-emerald-700 font-mono shrink-0 ml-2">
                    +₹{Number(tx.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <CreditCard className="w-6 h-6 text-[#8E9297] mx-auto mb-1.5 opacity-50" />
                <p className="text-xs font-bold text-[#1C1D22]">No settlements yet</p>
                <p className="text-[10px] text-[#8E9297]">Completed payments will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
