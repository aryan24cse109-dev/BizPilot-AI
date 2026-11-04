import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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
} from 'lucide-react';

export const InvoicesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeWorkspace, activeRole } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(18);
  const [discountRate, setDiscountRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: 'Website Development & Design', quantity: 1, unitPrice: 15000 }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      if (activeRole === 'business') {
        const res = await invoicesApi.listWorkspaceInvoices({
          status: statusFilter,
          search: searchQuery,
        });
        if (res.success) setInvoices(res.invoices || []);
      } else {
        const res = await invoicesApi.listClientInvoices({
          status: statusFilter,
          search: searchQuery,
        });
        if (res.success) setInvoices(res.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await clientsApi.getConnections();
      if (res.success) {
        setClients(res.data.accepted?.map((c) => c.user) || []);
        if (res.data.accepted?.[0]) {
          setSelectedClientId(res.data.accepted[0].user.id);
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

  // Live calculation of preview numbers
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
  const taxAmount = (subtotal * Number(taxRate || 0)) / 100;
  const discountAmount = (subtotal * Number(discountRate || 0)) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  const handleCreateInvoice = async (isDraft = false) => {
    if (!selectedClientId) {
      alert('Please select a recipient client.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await invoicesApi.createInvoice({
        clientId: selectedClientId,
        dueDate,
        currency: 'INR',
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
        setShowCreateModal(false);
        fetchInvoices();
        navigate(`/invoices/${res.data.id}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    setActionLoading(true);
    try {
      await invoicesApi.sendInvoice(invoiceId);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to send invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusOptions = ['ALL', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT', 'CANCELLED'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            {activeRole === 'business' ? 'Invoice Management' : 'Received Client Invoices'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {activeRole === 'business'
              ? 'Issue, track, and manage customer billing lifecycles'
              : 'Review received billing records and complete verified payments'}
          </p>
        </div>

        {activeRole === 'business' && (
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            Create New Invoice
          </Button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar py-0.5">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === status
                  ? 'bg-emerald-500 text-charcoal-950 shadow-md shadow-emerald-500/20'
                  : 'bg-charcoal-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-72 flex gap-2">
          <Input
            icon={Search}
            placeholder="Search invoice # or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="!py-2 text-xs"
          />
        </form>
      </div>

      {/* Invoices List */}
      {loading ? (
        <LoadingSpinner text="Fetching verified invoice records from PostgreSQL..." />
      ) : invoices.length > 0 ? (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice Number</th>
                  <th className="py-3.5 px-4 font-semibold">{activeRole === 'business' ? 'Client' : 'Business'}</th>
                  <th className="py-3.5 px-4 font-semibold">Issue Date</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Balance Due</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-charcoal-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {activeRole === 'business' ? inv.client?.name : inv.workspace?.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(inv.issueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200 font-mono">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-amber-400 font-mono">
                      ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-slate-300 hover:text-white transition flex items-center gap-1 font-medium text-[11px]"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </button>
                        <a
                          href={invoicesApi.downloadPdfUrl(inv.id)}
                          download={`Invoice-${inv.invoiceNumber}.pdf`}
                          className="p-1.5 rounded-lg bg-charcoal-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {activeRole === 'business' && inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSendInvoice(inv.id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition"
                            title="Send to Client"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={statusFilter === 'ALL' ? 'No invoices found' : `No ${statusFilter.toLowerCase()} invoices`}
          description={activeRole === 'business'
            ? 'Get started by creating your first invoice or asking the AI Assistant to generate one for you.'
            : 'You do not have any pending or historical invoices received in this view.'}
          actionLabel={activeRole === 'business' ? 'Create Invoice' : undefined}
          onAction={() => setShowCreateModal(true)}
        />
      )}

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Invoice"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Client & Due Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Recipient Client</label>
              {clients.length > 0 ? (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/80"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (@{c.username})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-amber-400 text-xs py-2">
                  No accepted clients found. Please connect with a client in the Clients tab first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/80"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 font-bold">Line Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-charcoal-950 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    placeholder="Item description / service"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="flex-1 bg-charcoal-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-20 bg-charcoal-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none"
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="w-28 bg-charcoal-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-100 text-right focus:outline-none font-mono"
                    min="0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-slate-300 font-medium mb-1">GST / Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-100"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Discount Rate (%)</label>
              <input
                type="number"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
                className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-100"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Financial Summary Preview */}
          <div className="rounded-xl bg-charcoal-950 p-4 border border-slate-800 space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax ({taxRate}%):</span>
              <span>₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount ({discountRate}%):</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-emerald-400 font-bold text-sm pt-2 border-t border-slate-800">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={submitting}
              onClick={() => handleCreateInvoice(true)}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={() => handleCreateInvoice(false)}
            >
              Create & Send Immediately
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
