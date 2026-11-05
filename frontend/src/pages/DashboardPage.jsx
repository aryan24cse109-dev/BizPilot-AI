import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardApi } from '../api/dashboard.api.js';
import {
  Search,
  ArrowUpRight,
  Sparkles,
  Share2,
  DollarSign,
  Percent,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState(2); // Wednesday default active

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await dashboardApi.getBusinessDashboard();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [activeWorkspace?.id]);

  const metrics = data?.metrics || {};

  // Formatted figures matching reference design
  const totalBalance = metrics.totalCollected ? Number(metrics.totalCollected) : 56874;
  const totalSales = metrics.totalInvoiced ? Number(metrics.totalInvoiced) : 24575;
  const profitTotal = 76356;

  // Capsule Chart Data (Mon - Sun matching reference design)
  const weeklyCapsuleData = [
    { day: 'Mon', heightPct: 35, filledAmount: '$12,000' },
    { day: 'Tue', heightPct: 75, filledAmount: '$32,000' },
    { day: 'Wed', heightPct: 82, filledAmount: '$33,567', active: true },
    { day: 'Thu', heightPct: 45, filledAmount: '$18,000' },
    { day: 'Fri', heightPct: 26, filledAmount: '$10,500' },
    { day: 'Sat', heightPct: 88, filledAmount: '$36,000' },
    { day: 'Sun', heightPct: 60, filledAmount: '$24,000' },
  ];

  // Last Orders list matching reference design
  const recentOrders = [
    {
      id: 'ord_1',
      name: 'David Astee',
      amount: '$1,456',
      status: 'Chargeback',
      statusType: 'chargeback',
      date: '11 Sep 2026',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
    },
    {
      id: 'ord_2',
      name: 'Maria Hulama',
      amount: '$42,4378',
      status: 'Completed',
      statusType: 'completed',
      date: '11 Sep 2026',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
    },
    {
      id: 'ord_3',
      name: 'Arnold Swarz',
      amount: '$3,412',
      status: 'Completed',
      statusType: 'completed',
      date: '11 Sep 2026',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
    },
    {
      id: 'ord_4',
      name: 'Rahul Sharma',
      amount: '$15,000',
      status: 'Completed',
      statusType: 'completed',
      date: '10 Sep 2026',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
    },
  ];

  // Recent Sales items
  const recentSales = [
    {
      name: 'Steven Summer',
      time: '02 Minutes Ago',
      amount: '+$52.00',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
    },
    {
      name: 'Jordan Maizee',
      time: '02 Minutes Ago',
      amount: '+$83.00',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
    },
    {
      name: 'Jessica Alba',
      time: '05 Minutes Ago',
      amount: '+$61.60',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
    },
    {
      name: 'Frank Miller',
      time: '10 Minutes Ago',
      amount: '+$152.00',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80',
    },
  ];

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
              Dashboard
            </h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: '#8E9297' }}>
              Payments Updates
            </p>
          </div>

          {/* Search Pill Input matching reference */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1C1D22] placeholder-slate-400 focus:outline-none focus:border-slate-400 shadow-xs"
              style={{ borderColor: '#E8E4DC' }}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3 PASTEL FEATURE CARDS (Sage, Gold, Indigo)             */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Balance (Pastel Sage) */}
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
                    $
                  </span>
                  Balance
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#B8CBB2', color: '#1A3018' }}
                >
                  + 17%
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#1A3018' }}>
                $ {totalBalance.toLocaleString('en-IN')}
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

          {/* Card 2: Sales (Pastel Honey Gold) */}
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
                    %
                  </span>
                  Sales
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#ECCB6F', color: '#3A2E12' }}
                >
                  + 23%
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#3A2E12' }}>
                $ {totalSales.toLocaleString('en-IN')}
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

          {/* Card 3: Upgrade / AI (Pastel Periwinkle Indigo) */}
          <div
            className="rounded-3xl p-5 flex flex-col justify-between shadow-xs h-44"
            style={{ backgroundColor: '#8E9EF8', color: '#FFFFFF' }}
          >
            <div>
              <h3 className="text-sm font-black tracking-tight text-white">Upgrade</h3>
              <p className="text-xs text-white/95 mt-1 leading-snug">
                Get more information and opportunities
              </p>
            </div>

            <button
              onClick={() => navigate('/business/ai')}
              className="w-full py-2 px-4 rounded-xl text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              style={{ backgroundColor: '#5D6FE8' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4A5CD6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5D6FE8')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Go Pro
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CAPSULE BAR CHART: "User in The Last Week"               */}
        {/* ======================================================== */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold block" style={{ color: '#8E9297' }}>
                User in The Last Week
              </span>
              <p className="text-2xl font-black text-[#1C1D22] tracking-tight mt-0.5">
                + 3,2%
              </p>
            </div>
            <button
              className="text-xs font-semibold hover:underline"
              style={{ color: '#8E9297' }}
            >
              See statistics for all time
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
                      {/* Tooltip dot */}
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
                        height: `${item.heightPct}%`,
                        backgroundColor: '#1C1D22',
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
        {/* LAST ORDERS SECTION                                      */}
        {/* ======================================================== */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-black text-[#1C1D22] tracking-tight">
                  Last Orders
                </h3>
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FAF8F5', color: '#8E9297', border: '1px solid #E8E4DC' }}
                >
                  Data Updates Every 3 Hours
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/business/invoices')}
              className="text-xs font-bold hover:underline self-start sm:self-auto"
              style={{ color: '#1C1D22' }}
            >
              View All Orders
            </button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: '#F0ECE4' }}>
                  <th className="pb-3 font-bold" style={{ color: '#8E9297' }}>Customer</th>
                  <th className="pb-3 font-bold" style={{ color: '#8E9297' }}>Total</th>
                  <th className="pb-3 font-bold" style={{ color: '#8E9297' }}>Status</th>
                  <th className="pb-3 font-bold text-right" style={{ color: '#8E9297' }}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#F5F2EA' }}>
                {recentOrders.map((order) => {
                  const isChargeback = order.statusType === 'chargeback';

                  return (
                    <tr key={order.id} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3.5 flex items-center gap-3">
                        <img
                          src={order.avatar}
                          alt={order.name}
                          className="w-8 h-8 rounded-full object-cover shadow-xs"
                        />
                        <span className="font-bold text-[#1C1D22]">{order.name}</span>
                      </td>

                      <td className="py-3.5 font-bold text-[#1C1D22]">
                        {order.amount}
                      </td>

                      <td className="py-3.5">
                        <span
                          className="px-3 py-1 rounded-full text-[11px] font-bold inline-block"
                          style={{
                            backgroundColor: isChargeback ? '#8E9EF8' : '#CFDDC8',
                            color: isChargeback ? '#FFFFFF' : '#1A3018',
                          }}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="py-3.5 text-right font-medium" style={{ color: '#8E9297' }}>
                        {order.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT SIDEBAR (320px)                                    */}
      {/* ======================================================== */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Monthly Profits Card */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-base font-black text-[#1C1D22] tracking-tight">
                Monthly Profits
              </h3>
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#8E9297' }}>
                Total Profit Growth of 26%
              </p>
            </div>
            <button
              className="p-1.5 rounded-xl hover:bg-slate-50 transition"
              style={{ color: '#8E9297' }}
              title="Share"
            >
              <Share2 className="w-4 h-4" />
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

                {/* Segment 1: Periwinkle / Indigo (60%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#8E9EF8"
                  strokeWidth="10"
                  strokeDasharray="143 238"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />

                {/* Segment 2: Honey Gold (24%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F9DC90"
                  strokeWidth="10"
                  strokeDasharray="57 238"
                  strokeDashoffset="-148"
                  strokeLinecap="round"
                />

                {/* Segment 3: Pastel Sage (16%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#CFDDC8"
                  strokeWidth="10"
                  strokeDasharray="38 238"
                  strokeDashoffset="-210"
                  strokeLinecap="round"
                />
              </svg>

              {/* Centered Total Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold" style={{ color: '#8E9297' }}>
                  Total
                </span>
                <span className="text-xl font-black text-[#1C1D22] tracking-tight">
                  $ {profitTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Legend Stats */}
            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#8E9EF8' }} />
                  <span className="font-semibold" style={{ color: '#8E9297' }}>Giveaway</span>
                </div>
                <span className="font-black text-[#1C1D22]">60%</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F9DC90' }} />
                  <span className="font-semibold" style={{ color: '#8E9297' }}>Affiliate</span>
                </div>
                <span className="font-black text-[#1C1D22]">24%</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#CFDDC8' }} />
                  <span className="font-semibold" style={{ color: '#8E9297' }}>Offline Sales</span>
                </div>
                <span className="font-black text-[#1C1D22]">16%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sales List */}
        <div
          className="rounded-3xl p-6 border shadow-xs"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-[#1C1D22] tracking-tight">
              Recent Sales
            </h3>
            <button
              onClick={() => navigate('/business/invoices')}
              className="text-xs font-semibold hover:underline"
              style={{ color: '#8E9297' }}
            >
              See All
            </button>
          </div>

          <div className="space-y-4">
            {recentSales.map((sale, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <img
                    src={sale.avatar}
                    alt={sale.name}
                    className="w-10 h-10 rounded-full object-cover shadow-xs"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1C1D22] leading-tight">
                      {sale.name}
                    </p>
                    <p className="text-[10px] font-medium leading-tight mt-0.5" style={{ color: '#8E9297' }}>
                      {sale.time}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-[#1C1D22]">
                  {sale.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
