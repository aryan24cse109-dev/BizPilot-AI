import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { invoicesApi } from '../api/invoices.api.js';
import { clientsApi } from '../api/clients.api.js';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Input } from '../components/common/Input.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Trash2,
  ExternalLink,
  Calendar,
  DollarSign,
  CheckCircle,
  Eye,
  CreditCard,
  Copy,
  Layers,
  Sparkles
} from 'lucide-react';

export const InvoicesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeWorkspace, activeRole } = useAuth();
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');
  const [modalTab, setModalTab] = useState('edit'); // 'edit' or 'preview'
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(18);
  const [discountRate, setDiscountRate] = useState(0);
  const [notes, setNotes] = useState('Thank you for your business. Payment is due within 14 days.');
  const [items, setItems] = useState([
    { description: 'Website Development & Design Retainer', quantity: 1, unitPrice: 15000 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      if (activeRole === 'business') {
        const res = await invoicesApi.listWorkspaceInvoices({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchQuery,
        });
        if (res.success) setInvoices(res.invoices || []);
      } else {
        const res = await invoicesApi.listClientInvoices({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchQuery,
        });
        if (res.success) setInvoices(res.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      toast.error('Failed to load invoices', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await clientsApi.getConnections();
      if (res.success) {
        const acceptedClients = res.data.accepted?.map((c) => c.user) || [];
        setClients(acceptedClients);
        if (acceptedClients.length > 0 && !selectedClientId) {
          setSelectedClientId(acceptedClients[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeRole, activeWorkspace?.id, statusFilter]);

  useEffect(() => {
    if (showCreateModal) fetchClients();
  }, [showCreateModal]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  // Line item handlers
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  const addPresetItem = (preset) => {
    setItems([...items, preset]);
    toast.info('Item Added', `Added preset: ${preset.description}`);
  };

  // Math
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
  const taxAmount = (subtotal * Number(taxRate || 0)) / 100;
  const discountAmount = (subtotal * Number(discountRate || 0)) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  const handleCreateInvoice = async (isDraft = false) => {
    if (!selectedClientId) {
      toast.warning('Client Required', 'Please select a recipient client.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await invoicesApi.createInvoice({
        clientId: selectedClientId,
        dueDate,
        currency,
        items: items.map((i) => ({
          description: i.description || 'Service',
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
        })),
        taxRate: Number(taxRate) || 0,
        discountRate: Number(discountRate) || 0,
        notes,
        isDraft,
      });

      if (res.success) {
        toast.success(
          isDraft ? 'Draft Saved' : 'Invoice Dispatched',
          `Invoice ${res.invoice?.invoiceNumber} for ₹${Number(res.invoice?.totalAmount).toLocaleString('en-IN')} created successfully.`
        );
        setShowCreateModal(false);
        fetchInvoices();
      }
    } catch (err) {
      toast.error('Invoice Creation Failed', err.message || 'Error occurred while saving invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to Clipboard', `${label}: ${text}`);
  };

  const selectedClientObj = clients.find(c => c.id === selectedClientId);

  const statusTabs = [
    { label: 'All Invoices', value: 'ALL' },
    { label: 'Sent / Pending', value: 'SENT' },
    { label: 'Paid in Full', value: 'PAID' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Drafts', value: 'DRAFT' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#1C1D22] tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1C1D22]" />
            {activeRole === 'business' ? 'Invoicing Control & Ledger' : 'My Incoming Invoices'}
          </h1>
          <p className="text-xs text-[#8E9297] font-medium mt-1">
            {activeRole === 'business'
              ? 'Create, issue, and manage verified digital tax invoices with instant payment tracking'
              : 'Review authoritative bills issued to you and complete verified payments'}
          </p>
        </div>

        {activeRole === 'business' && (
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => {
              setShowCreateModal(true);
              setModalTab('edit');
            }}
          >
            Create New Invoice
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8E4DC] shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {statusTabs.map((tab) => {
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
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice # or client..."
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

      {/* Invoices List / Table */}
      {loading ? (
        <LoadingSpinner text="Fetching verified invoice records from PostgreSQL..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={statusFilter === 'ALL' ? 'No invoices found' : `No ${statusFilter.toLowerCase()} invoices`}
          description={
            activeRole === 'business'
              ? 'Issue your first invoice to a connected client or speak to the AI Assistant to generate one automatically.'
              : 'You have no invoices matching this criteria.'
          }
          actionLabel={activeRole === 'business' ? 'Create Invoice Now' : undefined}
          onAction={activeRole === 'business' ? () => setShowCreateModal(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden border border-[#E8E4DC] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#8E9297] border-b border-[#E8E4DC]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Invoice #</th>
                  <th className="py-3.5 px-4 font-bold">{activeRole === 'business' ? 'Client' : 'Issuer'}</th>
                  <th className="py-3.5 px-4 font-bold">Issue Date</th>
                  <th className="py-3.5 px-4 font-bold">Due Date</th>
                  <th className="py-3.5 px-4 font-bold">Total Amount</th>
                  <th className="py-3.5 px-4 font-bold">Balance Due</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#FAF8F5] transition cursor-pointer group"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22] flex items-center gap-2">
                      <span>{inv.invoiceNumber}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(inv.invoiceNumber, 'Invoice Number');
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#1C1D22] transition"
                        title="Copy invoice number"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1C1D22]">
                      {activeRole === 'business' ? (inv.client?.name || 'Client') : (inv.workspace?.name || 'TechNova Solutions')}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#8E9297]">
                      {new Date(inv.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#8E9297]">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22]">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22]">
                      {Number(inv.balanceDue) > 0 ? (
                        <span className="text-amber-600">₹{Number(inv.balanceDue).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-emerald-600">₹0 (Paid)</span>
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
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-white text-slate-600 hover:text-[#1C1D22] border border-[#E8E4DC] transition"
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

      {/* CREATE INVOICE MODAL WITH LIVE PREVIEW */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Digital Tax Invoice"
        size="2xl"
      >
        <div className="space-y-4">
          {/* Modal Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setModalTab('edit')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                modalTab === 'edit'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Invoice Editor
            </button>
            <button
              type="button"
              onClick={() => setModalTab('preview')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                modalTab === 'preview'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Live Preview
            </button>
          </div>

          {modalTab === 'edit' ? (
            <div className="space-y-4">
              {/* Recipient Client & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Recipient Client <span className="text-emerald-400">*</span>
                  </label>
                  {clients.length > 0 ? (
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-charcoal-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      No accepted client connections found. Please connect with a client on the Clients page first.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Due Date <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-charcoal-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Preset Item Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Quick Add Preset Services:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { description: 'Full-Stack Web Application Retainer', quantity: 1, unitPrice: 25000 },
                    { description: 'UI/UX Interactive SaaS Design', quantity: 1, unitPrice: 18000 },
                    { description: 'Cloud DevOps & Architecture Setup', quantity: 1, unitPrice: 20000 },
                    { description: 'API Integration & Security Audit', quantity: 1, unitPrice: 15000 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addPresetItem(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-charcoal-800 hover:bg-emerald-500/15 hover:text-emerald-300 text-slate-300 border border-slate-700/60 transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" /> {preset.description.split(' ')[0]} (₹{preset.unitPrice.toLocaleString('en-IN')})
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-200">Billable Line Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-charcoal-950 p-2 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        placeholder="Item or service description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-14 bg-charcoal-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-white focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400">× ₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-24 bg-charcoal-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Discount Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    GST Rate (%):
                  </label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full bg-charcoal-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard Services)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Discount (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(Number(e.target.value))}
                    className="w-full bg-charcoal-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Payment Instructions & Notes:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-charcoal-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Live Calculation Preview Banner */}
              <div className="p-3.5 rounded-xl bg-charcoal-950 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({taxRate}%):</span>
                    <span className="font-mono text-slate-200">₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {discountRate > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Discount ({discountRate}%):</span>
                    <span className="font-mono text-rose-400">-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1.5 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Live Digital Tax Invoice Preview Tab */
            <div className="p-5 rounded-2xl bg-charcoal-950 border border-slate-800 text-xs space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{activeWorkspace?.name || 'TechNova Solutions'}</h3>
                  <p className="text-slate-400 text-[11px]">GSTIN: 29ABCDE1234F1Z5</p>
                  <p className="text-slate-400 text-[11px]">Bengaluru, Karnataka, India</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                    Tax Invoice Preview
                  </span>
                  <p className="font-mono text-slate-200 font-bold mt-1">INV-{Date.now().toString().slice(-6)}</p>
                  <p className="text-slate-400 text-[10px]">Due: {dueDate}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Billed To:</span>
                <p className="font-bold text-slate-100 text-sm">{selectedClientObj?.name || 'Selected Client'}</p>
                <p className="text-slate-400 text-[11px]">{selectedClientObj?.email || 'client@email.com'}</p>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-charcoal-900 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-slate-200">{it.description || 'Service'}</td>
                        <td className="py-2 px-3 text-center text-slate-300">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">₹{Number(it.unitPrice).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-100">
                          ₹{(Number(it.quantity) * Number(it.unitPrice)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-400 italic">{notes}</span>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400 block">Total Payable</span>
                  <span className="text-base font-bold text-emerald-400">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleCreateInvoice(true)}
              loading={submitting}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Send}
              onClick={() => handleCreateInvoice(false)}
              loading={submitting}
            >
              Issue & Send Immediately (₹{grandTotal.toLocaleString('en-IN')})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
