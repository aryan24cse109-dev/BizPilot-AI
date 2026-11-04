import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { paymentsApi } from '../api/payments.api.js';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { CreditCard, Search, ShieldCheck, Calendar, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

export const PaymentsPage = () => {
  const { activeWorkspace, activeRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      if (activeRole === 'business') {
        const res = await paymentsApi.getWorkspacePayments({ search });
        if (res.success) setPayments(res.payments || []);
      } else {
        const res = await paymentsApi.getClientPayments({ search });
        if (res.success) setPayments(res.payments || []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [activeRole, activeWorkspace?.id]);

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            {activeRole === 'business' ? 'Verified Payment Ledger' : 'Outgoing Payment Receipts'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative transactional history verified by payment provider adapters
          </p>
        </div>

        {/* Total volume badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-charcoal-900 border border-slate-800">
          <span className="text-xs text-slate-400">Total Verified Volume:</span>
          <span className="font-mono text-base font-bold text-emerald-400">
            ₹{totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by payment reference, invoice # or payer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
            className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={fetchPayments}
          className="px-4 py-2 bg-charcoal-800 hover:bg-charcoal-700 text-xs font-semibold rounded-xl text-slate-200 border border-slate-700 transition"
        >
          Filter
        </button>
      </div>

      {/* Payment Table */}
      {loading ? (
        <LoadingSpinner text="Querying payment records..." />
      ) : payments.length > 0 ? (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Payment ID</th>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">{activeRole === 'business' ? 'Client' : 'Recipient Business'}</th>
                  <th className="py-3.5 px-4 font-semibold">Gateway</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Date</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-charcoal-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {p.providerPaymentId}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {p.invoice?.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {activeRole === 'business' ? p.client?.name : p.workspace?.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.provider}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {p.paymentMethod || 'UPI'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(p.paymentDate).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No verified payments yet"
          description="Payments confirmed via verified Razorpay or PayPal sandbox transactions will appear in this ledger."
        />
      )}
    </div>
  );
};
