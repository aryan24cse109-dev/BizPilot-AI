import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi } from '../../api/payments.api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  CreditCard,
  Search,
  Download,
  Copy,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building
} from 'lucide-react';

export const ClientPaymentHistoryPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.getClientPayments({ search });
      if (res.success) setPayments(res.payments || []);
    } catch (err) {
      console.error('Failed to load client payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const copyReceipt = (id) => {
    navigator.clipboard.writeText(id);
    toast.success('Copied', `Transaction Reference: ${id}`);
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-primary" />
            Payment History & Receipts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative transactional receipts verified by payment gateways
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-surface-light dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Settled:</span>
          <span className="font-mono text-base font-bold text-emerald-primary ml-2">
            ₹{totalPaid.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="saas-card p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by receipt ID, vendor name, or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
            className="w-full bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-primary"
          />
        </div>
        <button
          onClick={fetchPayments}
          className="px-4 py-2 bg-slate-100 dark:bg-charcoal-800 hover:bg-slate-200 dark:hover:bg-charcoal-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 transition"
        >
          Filter
        </button>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving verified transaction receipts..." />
      ) : payments.length > 0 ? (
        <div className="saas-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-charcoal-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Transaction ID</th>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">Recipient Vendor</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Settlement Date</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>{p.providerPaymentId}</span>
                      <button
                        onClick={() => copyReceipt(p.providerPaymentId)}
                        className="text-slate-400 hover:text-emerald-primary transition"
                        title="Copy Reference"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-primary">
                      {p.invoice?.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {p.workspace?.name || 'TechNova Solutions'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 uppercase">
                      {p.paymentMethod || 'UPI'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(p.paymentDate).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-primary">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.invoiceId && (
                        <button
                          onClick={() => navigate(`/portal/invoices/${p.invoiceId}`)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-charcoal-800 hover:text-emerald-primary text-slate-600 dark:text-slate-400 transition"
                          title="View Invoice"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
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
          title="No payment receipts found"
          description="When you complete verified settlements via UPI or card, receipts will be recorded here."
        />
      )}
    </div>
  );
};
