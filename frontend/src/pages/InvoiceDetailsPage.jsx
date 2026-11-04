import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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
  AlertCircle
} from 'lucide-react';

export const InvoiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment checkout state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState('RAZORPAY');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.getInvoice(id);
      if (res.success && res.data) {
        setInvoice(res.data);
        setPaymentAmount(String(res.data.balanceDue));
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setError(err.message || 'Invoice not found or access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleInitiatePayment = async () => {
    setPaymentProcessing(true);
    try {
      // 1. Create order on backend
      const orderRes = await paymentsApi.createOrder({
        invoiceId: invoice.id,
        provider: paymentProvider,
        amount: Number(paymentAmount),
      });

      if (!orderRes.success) throw new Error(orderRes.message || 'Failed to initialize payment order');

      const { orderId, amount, currency } = orderRes.data;

      // 2. Complete verified sandbox transaction via verification endpoint
      const fakePaymentId = `pay_sbx_${Date.now()}`;
      const verifyRes = await paymentsApi.verifyPayment({
        invoiceId: invoice.id,
        provider: paymentProvider,
        providerOrderId: orderId,
        providerPaymentId: fakePaymentId,
        signature: 'sandbox_sig_valid',
        amount: Number(amount),
        currency,
        paymentMethod: paymentProvider === 'RAZORPAY' ? 'UPI' : 'PAYPAL',
      });

      if (verifyRes.success) {
        setPaymentSuccessData(verifyRes.data);
        fetchInvoice();
      }
    } catch (err) {
      alert(err.message || 'Payment processing failed.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading authoritative invoice records..." />;

  if (error || !invoice) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
        <p className="font-bold text-sm">Error Loading Invoice</p>
        <p className="text-xs mt-1 text-slate-400">{error || 'Invoice record not found.'}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const isClient = invoice.clientId === user?.id;
  const canPay = (isClient || activeRole === 'client') && Number(invoice.balanceDue) > 0 && invoice.status !== 'DRAFT';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>

        <div className="flex items-center gap-2.5">
          <a
            href={invoicesApi.downloadPdfUrl(invoice.id)}
            download={`Invoice-${invoice.invoiceNumber}.pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-xs font-semibold text-slate-200 border border-slate-700/60 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Download PDF
          </a>

          {canPay && (
            <Button
              variant="primary"
              size="sm"
              icon={CreditCard}
              onClick={() => {
                setPaymentSuccessData(null);
                setShowPaymentModal(true);
              }}
            >
              Pay Invoice (Sandbox)
            </Button>
          )}
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 border border-slate-800">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-2xl font-black text-emerald-400 tracking-tight">
                {invoice.invoiceNumber}
              </span>
              <Badge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-400">
              Created on {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Balance Due</span>
            <p className="font-mono text-2xl font-extrabold text-amber-400 mt-0.5">
              ₹{Number(invoice.balanceDue).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-400">
              Due Date: <strong className="text-slate-200">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</strong>
            </p>
          </div>
        </div>

        {/* Business & Client Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          {/* Issuer (From) */}
          <div className="p-4 rounded-2xl bg-charcoal-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              Issued By (Business)
            </div>
            <p className="font-bold text-slate-100 text-sm">
              {invoice.workspace?.businessProfile?.businessName || invoice.workspace?.name}
            </p>
            <p className="text-slate-400">
              {invoice.workspace?.businessProfile?.email || 'billing@bizpilot.io'}
            </p>
            <p className="text-slate-400">
              {invoice.workspace?.businessProfile?.addressLine1} {invoice.workspace?.businessProfile?.city}
            </p>
            {invoice.workspace?.businessProfile?.taxId && (
              <p className="text-slate-400 font-mono text-[11px]">
                GSTIN: {invoice.workspace?.businessProfile?.taxId}
              </p>
            )}
          </div>

          {/* Recipient (To) */}
          <div className="p-4 rounded-2xl bg-charcoal-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <User className="w-3.5 h-3.5 text-teal-400" />
              Billed To (Client)
            </div>
            <p className="font-bold text-slate-100 text-sm">{invoice.client?.name}</p>
            <p className="text-slate-400">{invoice.client?.email}</p>
            <p className="text-slate-400">@{invoice.client?.username}</p>
            <p className="text-emerald-400/90 text-[11px]">
              Verified Network Connection
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Service & Line Item Breakdown
          </h4>
          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 text-center font-semibold">Qty</th>
                  <th className="py-3 px-4 text-right font-semibold">Unit Price</th>
                  <th className="py-3 px-4 text-right font-semibold">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-charcoal-950/40">
                {(invoice.items || []).map((item) => (
                  <tr key={item.id}>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {item.description}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {Number(item.quantity)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                      ₹{Number(item.total).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Calculation */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-800">
          <div className="max-w-md text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Payment Instructions</p>
            <p className="leading-relaxed">
              {invoice.workspace?.businessProfile?.paymentInstructions || 
               'Please transfer to registered account via Razorpay Sandbox or verified UPI.'}
            </p>
            {invoice.notes && (
              <p className="pt-2 italic text-slate-400">Notes: {invoice.notes}</p>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span>₹{Number(invoice.subtotal).toLocaleString('en-IN')}</span>
            </div>
            {Number(invoice.taxRate) > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tax ({invoice.taxRate}% GST):</span>
                <span>₹{Number(invoice.taxAmount).toLocaleString('en-IN')}</span>
              </div>
            )}
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount ({invoice.discountRate}%):</span>
                <span>-₹{Number(invoice.discountAmount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
              <span>Grand Total:</span>
              <span>₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Amount Paid:</span>
              <span className="text-emerald-400">₹{Number(invoice.paidAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-amber-400 font-bold text-sm pt-1 border-t border-slate-800">
              <span>Balance Due:</span>
              <span>₹{Number(invoice.balanceDue).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Audit Lifecycle Events Timeline */}
        <div className="pt-6 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Audit Lifecycle & Event History
          </h4>

          <div className="space-y-3">
            {(invoice.events || []).map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">{ev.description}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(ev.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sandbox Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Complete Sandbox Payment"
        maxWidth="max-w-md"
      >
        <div className="space-y-5 text-xs">
          {paymentSuccessData ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">Payment Verified & Settled</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transaction ID: <span className="font-mono text-emerald-400">{paymentSuccessData.payment?.providerPaymentId}</span>
              </p>
              <p className="text-xs text-emerald-300 font-medium">
                {paymentSuccessData.message}
              </p>
              <Button
                variant="primary"
                size="sm"
                className="w-full mt-4"
                onClick={() => setShowPaymentModal(false)}
              >
                Close Receipt
              </Button>
            </div>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-charcoal-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Invoice:</span>
                <p className="font-mono font-bold text-emerald-400 text-sm">{invoice.invoiceNumber}</p>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Outstanding Balance:</span>
                  <span className="font-bold text-amber-400 font-mono">₹{Number(invoice.balanceDue).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Payment Gateway</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('RAZORPAY')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentProvider === 'RAZORPAY'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold'
                        : 'border-slate-800 bg-charcoal-950 text-slate-400'
                    }`}
                  >
                    <p className="text-xs">Razorpay</p>
                    <p className="text-[10px] text-slate-500 font-normal">UPI, Cards, NetBanking</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentProvider('PAYPAL')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentProvider === 'PAYPAL'
                        ? 'border-teal-500 bg-teal-500/10 text-teal-300 font-bold'
                        : 'border-slate-800 bg-charcoal-950 text-slate-400'
                    }`}
                  >
                    <p className="text-xs">PayPal</p>
                    <p className="text-[10px] text-slate-500 font-normal">International (Sandbox)</p>
                  </button>
                </div>
              </div>

              {/* Payable Amount Input (Supports Partial Payment) */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Pay Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={Number(invoice.balanceDue)}
                  className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  You can specify partial payment or full amount.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  loading={paymentProcessing}
                  onClick={handleInitiatePayment}
                  className="w-full"
                  icon={ShieldCheck}
                >
                  Confirm Sandbox Payment (₹{Number(paymentAmount).toLocaleString('en-IN')})
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
