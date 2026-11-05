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
        search: searchQuery || undefined,
      });
      const list = res?.data?.invoices || res?.invoices || [];
      setInvoices(list);
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
        <h1 className="text-xl sm:text-2xl font-black text-[#1C1D22] tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#1C1D22]" />
          My Invoices
        </h1>
        <p className="text-xs text-[#8E9297] font-medium mt-1">
          Authoritative tax invoices issued to you with full payment tracking and downloadable receipts.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8E4DC] shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isTabActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isTabActive
                    ? 'bg-[#1C1D22] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#8E9297] hover:text-[#1C1D22] border border-[#E8E4DC]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
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
              className="bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1C1D22] placeholder-slate-400 focus:outline-none focus:border-slate-400 w-48 sm:w-60"
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
        <div className="bg-white rounded-3xl overflow-hidden border border-[#E8E4DC] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#8E9297] border-b border-[#E8E4DC]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Invoice #</th>
                  <th className="py-3.5 px-4 font-bold">Vendor / Business</th>
                  <th className="py-3.5 px-4 font-bold">Issue Date</th>
                  <th className="py-3.5 px-4 font-bold">Due Date</th>
                  <th className="py-3.5 px-4 font-bold">Total Amount</th>
                  <th className="py-3.5 px-4 font-bold">Remaining Due</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                    className="hover:bg-[#FAF8F5] transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1C1D22]">
                      {inv.workspace?.name || 'TechNova Solutions'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#8E9297]">
                      {new Date(inv.issueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#8E9297]">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22]">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {Number(inv.balanceDue) > 0 ? (
                        <span className="text-amber-600">
                          ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold">₹0 (Paid)</span>
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
                          className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-white text-slate-600 hover:text-[#1C1D22] border border-[#E8E4DC] transition"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                          className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-white text-slate-600 hover:text-[#1C1D22] border border-[#E8E4DC] transition font-bold"
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

export default ClientInvoicesPage;
