import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { paymentsApi } from '../api/payments.api.js';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  CreditCard,
  Search,
  ShieldCheck,
  Calendar,
  ArrowDownLeft,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';

export const PaymentsPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace, activeRole } = useAuth();
  const toast = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.getPayments();
      const list = res?.data?.payments || res?.payments || [];
      setPayments(list);
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast.error('Ledger Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [activeRole, activeWorkspace?.id]);

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', `${label}: ${text}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#1C1D22] tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#1C1D22]" />
            {activeRole === 'business' ? 'Verified Payment Ledger' : 'Outgoing Payment Receipts'}
          </h1>
          <p className="text-xs text-[#8E9297] font-medium mt-1">
            Authoritative transactional history verified by payment provider adapters
          </p>
        </div>

        {/* Total volume badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-[#E8E4DC] shadow-xs">
          <span className="text-xs font-bold text-[#8E9297]">Total Verified Volume:</span>
          <span className="font-mono text-base font-black text-[#1C1D22]">
            ₹{totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl flex items-center gap-3 border border-[#E8E4DC] shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by payment reference, invoice # or payer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
            className="w-full bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl pl-10 pr-4 py-2 text-xs text-[#1C1D22] placeholder-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
        <button
          onClick={fetchPayments}
          className="px-4 py-2 bg-[#1C1D22] hover:bg-[#2C2D35] text-xs font-bold rounded-xl text-white transition shadow-xs"
        >
          Filter Records
        </button>
      </div>

      {/* Payment Table */}
      {loading ? (
        <LoadingSpinner text="Querying payment records..." />
      ) : payments.length > 0 ? (
        <div className="bg-white rounded-3xl overflow-hidden border border-[#E8E4DC] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#8E9297] border-b border-[#E8E4DC]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Receipt ID</th>
                  <th className="py-3.5 px-4 font-bold">Invoice #</th>
                  <th className="py-3.5 px-4 font-bold">{activeRole === 'business' ? 'Client' : 'Recipient Business'}</th>
                  <th className="py-3.5 px-4 font-bold">Gateway</th>
                  <th className="py-3.5 px-4 font-bold">Method</th>
                  <th className="py-3.5 px-4 font-bold">Payment Date</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF8F5] transition group">
                    <td className="py-3.5 px-4 font-mono font-medium text-[#1C1D22] flex items-center gap-1.5">
                      <span>{p.providerPaymentId}</span>
                      <button
                        onClick={() => copyToClipboard(p.providerPaymentId, 'Receipt ID')}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#1C1D22] transition"
                        title="Copy payment ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22]">
                      {p.invoice?.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1C1D22]">
                      {activeRole === 'business' ? p.client?.name : p.workspace?.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E8E4DC] text-[#1C1D22]">
                        {p.provider}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#8E9297] font-mono text-[11px] uppercase">
                      {p.paymentMethod || 'UPI'}
                    </td>
                    <td className="py-3.5 px-4 text-[#8E9297] font-medium">
                      {new Date(p.paymentDate).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22]">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.invoiceId && (
                        <button
                          onClick={() => navigate(`/invoices/${p.invoiceId}`)}
                          className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-white text-slate-600 hover:text-[#1C1D22] border border-[#E8E4DC] transition"
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
          title="No verified payments yet"
          description="Payments confirmed via verified Razorpay or PayPal sandbox transactions will appear in this ledger."
        />
      )}
    </div>
  );
};

export default PaymentsPage;
