import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { invoicesApi } from '../api/invoices.api.js';
import { paymentsApi } from '../api/payments.api.js';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import {
  FileText,
  Download,
  CreditCard,
  Send,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  User,
  AlertCircle,
  Copy,
  Printer,
  QrCode,
  Smartphone,
  Check,
  Sparkles,
  ExternalLink,
  Ban,
  Edit,
  History
} from 'lucide-react';

export const InvoiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const toast = useToast();

  const [invoice, setInvoice] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Edit draft state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  // Payment checkout state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const [res, paymentsRes] = await Promise.all([
        invoicesApi.getInvoice(id),
        paymentsApi.getInvoicePayments(id).catch(() => ({ data: { payments: [] } })),
      ]);
      const invoiceData = res?.data || res;
      if (invoiceData) {
        setInvoice(invoiceData);
        setEditNotes(invoiceData.notes || '');
        if (invoiceData.dueDate) {
          setEditDueDate(new Date(invoiceData.dueDate).toISOString().split('T')[0]);
        }
        setPaymentAmount(String(invoiceData.balanceDue || invoiceData.totalAmount || 0));
      }

      const pList = paymentsRes?.data?.payments || paymentsRes?.payments || [];
      setInvoicePayments(pList);
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setError(err.message || 'Invoice not found or access denied.');
      toast.error('Load Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleSendInvoice = async () => {
    setActionLoading(true);
    try {
      await invoicesApi.sendInvoice(invoice.id);
      toast.success('Invoice Dispatched', `Invoice ${invoice.invoiceNumber} delivered to client.`);
      fetchInvoice();
    } catch (err) {
      toast.error('Dispatch Failed', err.message || 'Could not send invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice? This action cannot be reversed.')) {
      return;
    }
    setActionLoading(true);
    try {
      await invoicesApi.cancelInvoice(invoice.id, { reason: 'Cancelled by business user' });
      toast.success('Invoice Cancelled', `Invoice ${invoice.invoiceNumber} marked as cancelled.`);
      fetchInvoice();
    } catch (err) {
      toast.error('Cancellation Failed', err.message || 'Could not cancel invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    setSavingDraft(true);
    try {
      await invoicesApi.updateInvoice(invoice.id, {
        notes: editNotes,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
      });
      toast.success('Draft Updated', 'Invoice draft details saved successfully.');
      setShowEditModal(false);
      fetchInvoice();
    } catch (err) {
      toast.error('Update Failed', err.message || 'Could not update draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleInitiatePayment = async () => {
    setPaymentProcessing(true);
    try {
      const idempotencyKey = `idemp_${invoice.id}_${Date.now()}`;
      const orderRes = await paymentsApi.createOrder(invoice.id, {
        amount: Number(paymentAmount),
        idempotencyKey,
      });

      const orderData = orderRes?.data || orderRes;

      if (orderData?.keyId && orderData?.orderId && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: Math.round(Number(paymentAmount) * 100),
          currency: invoice.currency || 'INR',
          name: invoice.businessUser?.businessProfile?.businessName || invoice.workspace?.name || 'Authorized Merchant',
          description: `Payment for Invoice ${invoice.invoiceNumber}`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              const verifyRes = await paymentsApi.verifyPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setPaymentSuccessData(verifyRes?.data || verifyRes);
              toast.success('Payment Verified Successfully!');
              fetchInvoice();
            } catch (vErr) {
              toast.error('Payment Verification Failed', vErr.message);
            }
          },
          prefill: {
            name: user?.name || 'Client',
            email: user?.email || '',
          },
          theme: { color: '#17A673' },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.info(
          'Payment Order Prepared',
          `Order ${orderData?.orderId || 'registered'} created with gateway.`
        );
      }
    } catch (err) {
      toast.error('Payment Error', err.message || 'Payment processing failed.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', `${label}: ${text}`);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading authoritative invoice records..." />;

  if (error || !invoice) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 max-w-xl mx-auto mt-10">
        <p className="font-bold text-sm">Error Loading Invoice</p>
        <p className="text-xs mt-1 text-slate-400">{error || 'Invoice record not found.'}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/business/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const isBusiness = activeRole === 'business' || user?.accountCategory === 'BUSINESS';
  const isDraft = invoice.status === 'DRAFT';
  const canCancel = isBusiness && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  const canSend = isBusiness && isDraft;
  const canEdit = isBusiness && isDraft;
  const canPay = !isBusiness && Number(invoice.balanceDue) > 0 && invoice.status !== 'DRAFT';

  // Tax math breakdown
  const subtotal = Number(invoice.subtotal || invoice.totalAmount / 1.18);
  const taxAmount = Number(invoice.taxAmount || invoice.totalAmount - subtotal);
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;

  // Timeline events
  const timeline = [
    { label: 'Created', date: invoice.createdAt, done: true },
    { label: 'Sent to Client', date: invoice.sentAt || (invoice.status !== 'DRAFT' ? invoice.createdAt : null), done: invoice.status !== 'DRAFT' },
    { label: 'Client Viewed', date: invoice.viewedAt, done: invoice.status === 'VIEWED' || invoice.status === 'PAID' },
    { label: 'Paid in Full', date: invoice.paidAt, done: invoice.status === 'PAID' || Number(invoice.balanceDue) === 0 },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(isBusiness ? '/business/invoices' : '/portal/invoices')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => copyToClipboard(window.location.href, 'Invoice URL')}
            className="p-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-xs font-semibold text-slate-300 border border-slate-700/60 transition flex items-center gap-1.5"
            title="Copy invoice link"
          >
            <Copy className="w-3.5 h-3.5" /> Share
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-xs font-semibold text-slate-300 border border-slate-700/60 transition flex items-center gap-1.5"
            title="Print invoice"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>

          <a
            href={invoicesApi.downloadPdfUrl(invoice.id)}
            download={`Invoice-${invoice.invoiceNumber}.pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-xs font-semibold text-slate-200 border border-slate-700/60 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Download PDF
          </a>

          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              icon={Edit}
              onClick={() => setShowEditModal(true)}
            >
              Edit Draft
            </Button>
          )}

          {canSend && (
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              loading={actionLoading}
              onClick={handleSendInvoice}
            >
              Send to Client
            </Button>
          )}

          {canCancel && (
            <Button
              variant="secondary"
              size="sm"
              icon={Ban}
              loading={actionLoading}
              onClick={handleCancelInvoice}
              className="text-rose-400 hover:text-rose-300 border-rose-500/30"
            >
              Cancel Invoice
            </Button>
          )}

          {canPay && (
            <Button
              variant="primary"
              size="sm"
              icon={CreditCard}
              onClick={() => {
                setShowPaymentModal(true);
                setPaymentSuccessData(null);
              }}
            >
              Pay Now (₹{Number(invoice.balanceDue).toLocaleString('en-IN')})
            </Button>
          )}
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {timeline.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step.done
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-charcoal-800 text-slate-500 border border-slate-700'
                }`}
              >
                {step.done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold leading-tight ${step.done ? 'text-slate-100' : 'text-slate-500'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {step.date ? new Date(step.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Pending'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Authoritative Tax Invoice Document Card */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800/80 shadow-2xl space-y-8 bg-charcoal-900/95">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <img src="/wealthra-logo.png" alt="Logo" className="h-6 w-auto object-contain" />
              <h2 className="text-xl font-black text-white tracking-tight">
                {invoice.businessUser?.businessProfile?.businessName || invoice.workspace?.name || 'Wealthra Merchant'}
              </h2>
            </div>
            {invoice.businessUser?.businessProfile?.taxId && (
              <p className="text-xs text-slate-400 mt-2">
                GSTIN: {invoice.businessUser.businessProfile.taxId}
              </p>
            )}
            {invoice.businessUser?.businessProfile?.address && (
              <p className="text-xs text-slate-400">
                {invoice.businessUser.businessProfile.address}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1.5">
            <div className="inline-block">
              <Badge status={invoice.status} />
            </div>
            <p className="font-mono text-base font-black text-emerald-400 tracking-wider">
              {invoice.invoiceNumber}
            </p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Issue Date: <span className="text-slate-200">{new Date(invoice.createdAt || invoice.issueDate).toLocaleDateString('en-IN')}</span></p>
              <p>Due Date: <span className="text-slate-200 font-semibold">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Due on receipt'}</span></p>
            </div>
          </div>
        </div>

        {/* Bill To & Billed By Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 rounded-2xl bg-charcoal-950/70 border border-slate-800/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Billed To (Client):
            </span>
            <p className="font-bold text-slate-100 text-sm">{invoice.clientName || invoice.client?.name || 'Recipient Client'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{invoice.clientEmail || invoice.client?.email}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1.5">
              <Building className="w-3.5 h-3.5 text-teal-400" /> Settlement Terms:
            </span>
            <p className="text-xs text-slate-300 font-semibold">Net 14 Days • Digital Tax Settlement</p>
            <p className="text-xs text-slate-400 mt-0.5">Currency: {invoice.currency || 'INR'} (₹)</p>
            <p className="text-xs text-emerald-400 mt-0.5 font-mono">
              Status: {Number(invoice.balanceDue) === 0 ? 'SETTLED' : 'OUTSTANDING'}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-charcoal-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">#</th>
                <th className="py-3 px-4 font-semibold">Service Description</th>
                <th className="py-3 px-4 font-semibold text-center">Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Unit Rate</th>
                <th className="py-3 px-4 font-semibold text-right">Tax Rate</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-charcoal-800/20">
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{item.description}</td>
                  <td className="py-3.5 px-4 text-center text-slate-200">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    {item.taxRate ? `${item.taxRate}%` : '0%'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                    ₹{Number(item.lineTotal || item.amount || item.quantity * item.unitPrice).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
          {/* Notes */}
          <div className="space-y-3">
            {invoice.notes && (
              <div className="p-4 rounded-xl bg-charcoal-950 border border-slate-800 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Invoice Notes & Terms:
                </span>
                <p className="text-slate-300 italic">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          {/* Ledger Totals */}
          <div className="p-4 rounded-xl bg-charcoal-950 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST Tax Amount:</span>
              <span className="text-slate-200">₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            {Number(invoice.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount Applied:</span>
                <span>-₹{Number(invoice.discountAmount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
              <span>Total Invoice Amount:</span>
              <span>₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1">
              <span>Balance Due:</span>
              <span>₹{Number(invoice.balanceDue).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Verified Ledger Badge */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authoritative record synchronized with Neon PostgreSQL</span>
          </div>
          <span className="font-mono">ID: {invoice.id}</span>
        </div>
      </div>

      {/* PAYMENT HISTORY & AUDIT TRAIL */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Invoice Settlement Transactions</h3>
        </div>

        {invoicePayments.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Gateway Ref</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoicePayments.map((p) => (
                  <tr key={p.id} className="hover:bg-charcoal-800/20">
                    <td className="py-2.5 px-3 font-mono text-slate-300">{p.providerPaymentId || p.providerOrderId || p.id}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(p.createdAt || p.paymentDate).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-slate-300 uppercase">{p.paymentMethod || 'Razorpay'}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3"><Badge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-3">
            No payments recorded yet for this invoice.
          </p>
        )}
      </div>

      {/* EDIT DRAFT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Draft Invoice ${invoice.invoiceNumber}`}
        size="md"
      >
        <form onSubmit={handleSaveDraft} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full bg-charcoal-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Terms</label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full bg-charcoal-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              placeholder="Add payment notes or special instructions..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={savingDraft}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* PAYMENT CHECKOUT MODAL */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Complete Verified Settlement"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Payable Balance</span>
              <p className="font-mono text-xl font-black text-white">₹{Number(paymentAmount).toLocaleString('en-IN')}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40">
              Razorpay Gateway
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Click below to launch the secure checkout dialog and settle Invoice {invoice.invoiceNumber}.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={paymentProcessing}
              onClick={handleInitiatePayment}
              icon={CreditCard}
            >
              Launch Razorpay Checkout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceDetailsPage;
