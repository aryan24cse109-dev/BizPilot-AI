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
  Sparkles,
  Users
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
  const [clientMode, setClientMode] = useState(
    searchParams.get('clientName') || searchParams.get('clientEmail') ? 'new' : 'select'
  );
  const [customClientName, setCustomClientName] = useState(searchParams.get('clientName') || '');
  const [customClientEmail, setCustomClientEmail] = useState(searchParams.get('clientEmail') || '');
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
    { description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.listWorkspaceInvoices({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      const list = res?.data?.invoices || res?.invoices || [];
      setInvoices(list);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      toast.error('Failed to load invoices', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const [connRes, invRes] = await Promise.all([
        clientsApi.getConnections().catch(() => ({ data: { connections: [] } })),
        invoicesApi.listWorkspaceInvoices({ limit: 100 }).catch(() => ({ data: { invoices: [] } })),
      ]);

      const conns = connRes?.data?.connections || connRes?.connections || [];
      const pastInvoices = invRes?.data?.invoices || invRes?.invoices || [];

      const clientMap = new Map();

      // From active connections
      conns.forEach((c) => {
        if (c.clientUser && c.clientUser.email) {
          const email = c.clientUser.email.toLowerCase();
          clientMap.set(email, {
            id: c.clientUser.id,
            name: c.clientUser.fullName || c.clientUser.username || 'Client User',
            email,
          });
        }
      });

      // From previous invoices
      pastInvoices.forEach((inv) => {
        if (inv.clientEmail) {
          const email = inv.clientEmail.toLowerCase();
          if (!clientMap.has(email)) {
            clientMap.set(email, {
              id: inv.clientUserId || email,
              name: inv.clientName || 'Invoiced Client',
              email,
            });
          }
        }
      });

      const clientList = Array.from(clientMap.values());
      setClients(clientList);

      const paramEmail = searchParams.get('clientEmail')?.toLowerCase();
      if (paramEmail) {
        const found = clientList.find((c) => c.email === paramEmail);
        if (found) {
          setSelectedClientId(found.id);
          setClientMode('select');
        } else {
          setCustomClientEmail(paramEmail);
          setCustomClientName(searchParams.get('clientName') || '');
          setClientMode('new');
        }
      } else if (clientList.length > 0 && !selectedClientId) {
        setSelectedClientId(clientList[0].id);
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
    setSubmitting(true);
    try {
      const isNew = clientMode === 'new';
      const selectedClient = clients.find((c) => c.id === selectedClientId || c.email === selectedClientId);

      const clientName = isNew ? customClientName.trim() : (selectedClient?.name || 'Valued Client');
      const clientEmail = isNew ? customClientEmail.trim() : (selectedClient?.email || '');

      if (!clientName || !clientEmail) {
        toast.error('Client Required', 'Please provide a client name and email address.');
        setSubmitting(false);
        return;
      }

      const invoicePayload = {
        clientName,
        clientEmail: clientEmail.toLowerCase().trim(),
        currency,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        discountAmount: String(discountAmount || 0),
        notes,
        items: items.map((i) => ({
          description: i.description || 'Professional Services',
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          taxRate: String(taxRate || 0),
        })),
      };

      const res = await invoicesApi.createInvoice(invoicePayload);
      const created = res?.data || res?.invoice || res;

      if (!isDraft && created?.id) {
        try {
          await invoicesApi.sendInvoice(created.id);
        } catch (sendErr) {
          console.warn('Auto-dispatch send notice:', sendErr);
        }
      }

      toast.success(
        isDraft ? 'Draft Saved' : 'Invoice Dispatched',
        `Invoice ${created?.invoiceNumber || 'draft'} for ₹${Number(grandTotal).toLocaleString('en-IN')} created successfully for ${clientName}.`
      );
      setShowCreateModal(false);
      fetchInvoices();
    } catch (err) {
      toast.error('Invoice Creation Failed', err.message || 'Error occurred while saving invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvoice = async (id) => {
    try {
      await invoicesApi.sendInvoice(id);
      toast.success('Invoice Sent', 'Invoice has been sent to client.');
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to send invoice', err.message);
    }
  };

  const handleCancelInvoice = async (id) => {
    try {
      await invoicesApi.cancelInvoice(id, { reason: 'User cancelled' });
      toast.success('Invoice Cancelled', 'Invoice status updated.');
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to cancel invoice', err.message);
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${isTabActive
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
                    onClick={() => navigate(activeRole === 'business' ? `/business/invoices/${inv.id}` : `/portal/invoices/${inv.id}`)}
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
                      {activeRole === 'business'
                        ? (inv.clientName || inv.clientEmail)
                        : (inv.businessUser?.businessProfile?.businessName || inv.businessUser?.fullName || 'Business Workspace')}
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
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={invoicesApi.downloadPdfUrl(inv.id)}
                          download={`Invoice-${inv.invoiceNumber}.pdf`}
                          className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-white text-slate-600 hover:text-[#1C1D22] border border-[#E8E4DC] transition"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {activeRole === 'business' && inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSendInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-white text-emerald-600 border border-[#E8E4DC] transition"
                            title="Send Invoice to Client"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {activeRole === 'business' && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-white text-rose-500 border border-[#E8E4DC] transition"
                            title="Cancel Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(activeRole === 'business' ? `/business/invoices/${inv.id}` : `/portal/invoices/${inv.id}`)}
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
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Modal Tabs */}
          <div className="flex items-center gap-2 border-b border-[#E8E4DC] pb-3">
            <button
              type="button"
              onClick={() => setModalTab('edit')}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${modalTab === 'edit'
                  ? 'bg-[#1C1D22] text-white shadow-xs'
                  : 'text-[#8E9297] hover:text-[#1C1D22] hover:bg-[#FAF8F5]'
                }`}
            >
              Invoice Editor
            </button>
            <button
              type="button"
              onClick={() => setModalTab('preview')}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${modalTab === 'preview'
                  ? 'bg-[#1C1D22] text-white shadow-xs'
                  : 'text-[#8E9297] hover:text-[#1C1D22] hover:bg-[#FAF8F5]'
                }`}
            >
              <Eye className="w-3.5 h-3.5" /> Live Preview
            </button>
          </div>

          {modalTab === 'edit' ? (
            <div className="space-y-4">
              {/* Client Selection / Direct Input */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1C1D22] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1C1D22]" />
                    Billed Client Details <span className="text-amber-600">*</span>
                  </label>

                  <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-xl border border-[#E8E4DC]">
                    <button
                      type="button"
                      onClick={() => setClientMode('select')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition ${
                        clientMode === 'select'
                          ? 'bg-white text-[#1C1D22] shadow-xs'
                          : 'text-[#8E9297] hover:text-[#1C1D22]'
                      }`}
                    >
                      Client List ({clients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMode('new')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition ${
                        clientMode === 'new'
                          ? 'bg-white text-[#1C1D22] shadow-xs'
                          : 'text-[#8E9297] hover:text-[#1C1D22]'
                      }`}
                    >
                      + Enter New Client
                    </button>
                  </div>
                </div>

                {clientMode === 'select' && clients.length > 0 ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8E9297] mb-1">
                      Choose from your client directory:
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1D22] font-medium focus:outline-none focus:border-[#1C1D22]"
                    >
                      {clients.map((c) => (
                        <option key={c.id || c.email} value={c.id || c.email}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8E9297] mb-1">Client Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Innovations"
                        value={customClientName}
                        onChange={(e) => setCustomClientName(e.target.value)}
                        className="w-full bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1D22] placeholder-[#8E9297] focus:outline-none focus:border-[#1C1D22]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8E9297] mb-1">Client Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. billing@acme.com"
                        value={customClientEmail}
                        onChange={(e) => setCustomClientEmail(e.target.value)}
                        className="w-full bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1D22] placeholder-[#8E9297] focus:outline-none focus:border-[#1C1D22]"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 text-[10px] text-[#8E9297]">
                      ℹ️ The client will automatically receive an onboarding invitation. When they sign in with this email, the invoice will automatically link to their account.
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1D22] mb-1.5">
                    Due Date <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1D22] focus:outline-none focus:border-[#1C1D22]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1D22] mb-1.5">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={currency}
                    disabled
                    className="w-full bg-[#EFECE6] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#8E9297] font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Preset Item Chips */}
              <div>
                <span className="text-[11px] font-bold text-[#8E9297] block mb-1.5">Quick Add Preset Services:</span>
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
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#F5C869]/20 hover:text-[#1C1D22] text-[#1C1D22] border border-[#E8E4DC] transition flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3 h-3 text-[#1C1D22]" /> {preset.description.split(' ')[0]} (₹{preset.unitPrice.toLocaleString('en-IN')})
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#1C1D22]">Billable Line Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-[#1C1D22] hover:text-[#F5C869] font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-[#FAF8F5] p-2.5 rounded-2xl border border-[#E8E4DC]">
                      <input
                        type="text"
                        placeholder="Item or service description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="flex-1 bg-transparent text-xs text-[#1C1D22] placeholder-[#8E9297] font-medium focus:outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-14 bg-white border border-[#E8E4DC] rounded-xl px-2 py-1 text-xs text-center text-[#1C1D22] font-semibold focus:outline-none focus:border-[#1C1D22]"
                      />
                      <span className="text-xs text-[#8E9297] font-semibold">× ₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-24 bg-white border border-[#E8E4DC] rounded-xl px-2 py-1 text-xs text-right font-mono font-semibold text-[#1C1D22] focus:outline-none focus:border-[#1C1D22]"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-[#8E9297] hover:text-rose-600 p-1 transition"
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
                  <label className="block text-[11px] font-bold text-[#8E9297] mb-1">
                    GST Rate (%):
                  </label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1D22] font-medium focus:outline-none focus:border-[#1C1D22]"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard Services)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8E9297] mb-1">
                    Discount (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(Number(e.target.value))}
                    className="w-full bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1D22] font-mono font-medium focus:outline-none focus:border-[#1C1D22]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#8E9297] mb-1">
                  Payment Instructions & Notes:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-[#E8E4DC] rounded-xl p-2.5 text-xs text-[#1C1D22] placeholder-[#8E9297] font-medium focus:outline-none focus:border-[#1C1D22] resize-none"
                />
              </div>

              {/* Live Calculation Preview Banner */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#8E9297] font-medium">
                  <span>Subtotal:</span>
                  <span className="font-mono text-[#1C1D22] font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-[#8E9297] font-medium">
                    <span>GST ({taxRate}%):</span>
                    <span className="font-mono text-[#1C1D22] font-bold">₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {discountRate > 0 && (
                  <div className="flex justify-between text-[#8E9297] font-medium">
                    <span>Discount ({discountRate}%):</span>
                    <span className="font-mono text-rose-600 font-bold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#1C1D22] font-black text-sm pt-2 border-t border-[#E8E4DC]">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Live Digital Tax Invoice Preview Tab */
            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs space-y-4 text-[#1C1D22]">
              <div className="flex justify-between items-start border-b border-[#E8E4DC] pb-3">
                <div>
                  <h3 className="text-base font-black text-[#1C1D22]">
                    {user?.businessProfile?.businessName || activeWorkspace?.name || user?.fullName || 'Wealthra Business'}
                  </h3>
                  <p className="text-[#8E9297] text-[11px] font-medium">
                    {user?.businessProfile?.taxId ? `GSTIN: ${user.businessProfile.taxId}` : 'Verified Digital Merchant'}
                  </p>
                  <p className="text-[#8E9297] text-[11px] font-medium">
                    {user?.businessProfile?.city ? `${user.businessProfile.city}, ${user.businessProfile.country || 'India'}` : 'India'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#F5C869]/20 text-[#1C1D22] border border-[#E5B550] uppercase font-bold">
                    Tax Invoice Preview
                  </span>
                  <p className="font-mono text-[#1C1D22] font-black mt-1">INV-{Date.now().toString().slice(-6)}</p>
                  <p className="text-[#8E9297] text-[10px] font-medium">Due: {dueDate}</p>
                </div>
              </div>

              <div>
                <span className="text-[#8E9297] text-[10px] uppercase font-bold tracking-wider">Billed To:</span>
                <p className="font-black text-[#1C1D22] text-sm mt-0.5">{selectedClientObj?.name || 'Selected Client'}</p>
                <p className="text-[#8E9297] text-[11px] font-medium">{selectedClientObj?.email || 'client@email.com'}</p>
              </div>

              <div className="rounded-2xl border border-[#E8E4DC] overflow-hidden bg-white">
                <table className="w-full text-left">
                  <thead className="bg-[#EFECE6] text-[#1C1D22] border-b border-[#E8E4DC] text-[11px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E4DC]">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF8F5]/50 transition">
                        <td className="py-2.5 px-3 text-[#1C1D22] font-medium">{it.description || 'Service'}</td>
                        <td className="py-2.5 px-3 text-center text-[#1C1D22] font-semibold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#1C1D22]">₹{Number(it.unitPrice).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1C1D22]">
                          ₹{(Number(it.quantity) * Number(it.unitPrice)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-[#8E9297] italic">{notes}</span>
                <div className="text-right font-mono">
                  <span className="text-xs text-[#8E9297] block font-sans font-semibold">Total Payable</span>
                  <span className="text-lg font-black text-[#1C1D22]">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E4DC]">
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
              Issue & Send (₹{grandTotal.toLocaleString('en-IN')})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
