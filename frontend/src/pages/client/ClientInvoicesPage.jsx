import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '../../api/invoices.api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  FileText,
  Search,
  Download,
  CreditCard,
  Eye,
  Calendar,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const ClientInvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.listClientInvoices({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery,
      });
      if (res.success) setInvoices(res.invoices || []);
    } catch (err) {
      console.error('Failed to load client invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const tabs = [
    { label: 'All Invoices', value: 'ALL' },
    { label: 'Awaiting Payment', value: 'SENT' },
    { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
    { label: 'Paid in Full', value: 'PAID' },
    { label: 'Overdue', value: 'OVERDUE' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-primary" />
          My Invoices
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Authoritative tax invoices issued to you with full payment tracking and downloadable receipts.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="saas-card p-4 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? 'bg-emerald-primary/10 text-emerald-primary dark:text-emerald-400 border border-emerald-primary/30'
                  : 'bg-slate-100 dark:bg-charcoal-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-slate-700/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-primary w-48 sm:w-60"
            />
          </div>
          <Button variant="secondary" size="sm" type="submit">
            Search
          </Button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving authoritative invoices..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={
            statusFilter === 'ALL'
              ? 'You do not have any invoices at this time.'
              : `No invoices match the status "${statusFilter}".`
          }
        />
      ) : (
        <div className="saas-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-charcoal-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">Vendor / Business</th>
                  <th className="py-3.5 px-4 font-semibold">Issue Date</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Remaining Due</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-charcoal-800/40 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-primary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {inv.workspace?.name || 'TechNova Solutions'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(inv.issueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {Number(inv.balanceDue) > 0 ? (
                        <span className="text-amber-500">
                          ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-emerald-primary">₹0 (Paid)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={invoicesApi.downloadPdfUrl(inv.id)}
                          download={`Invoice-${inv.invoiceNumber}.pdf`}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-charcoal-800 hover:text-emerald-primary transition text-slate-600 dark:text-slate-400"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-primary hover:bg-emerald-500/20 transition font-semibold"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
