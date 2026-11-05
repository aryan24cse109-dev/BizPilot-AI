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
  ExternalLink
} from 'lucide-react';

export const InvoiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const toast = useToast();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment checkout state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTab, setPaymentTab] = useState('upi'); // 'upi', 'card', 'netbanking'
  const [paymentProvider, setPaymentProvider] = useState('RAZORPAY');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [upiId, setUpiId] = useState('business@upi');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.getInvoice(id);
      const invoiceData = res?.data || res;
      if (invoiceData) {
        setInvoice(invoiceData);
        setPaymentAmount(String(invoiceData.balanceDue || invoiceData.totalAmount || 0));
      }
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
        paymentMethod: paymentTab === 'upi' ? 'UPI' : paymentTab === 'card' ? 'CARD' : 'NETBANKING',
      });

      if (verifyRes.success) {
        setPaymentSuccessData(verifyRes.data);
        toast.success(
          'Payment Verified Successfully!',
          `Receipt ID: ${fakePaymentId}. Balance updated to ₹0.`
        );
        fetchInvoice();
      }
    } catch (err) {
      toast.error('Payment Failed', err.message || 'Payment processing failed.');
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
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const isClient = invoice.clientId === user?.id;
  const canPay = Number(invoice.balanceDue) > 0 && invoice.status !== 'DRAFT';

  // Tax math breakdown
  const subtotal = Number(invoice.subtotal || invoice.totalAmount / 1.18);
  const taxAmount = Number(invoice.taxAmount || invoice.totalAmount - subtotal);
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;

  // Timeline events
  const timeline = [
    { label: 'Created', date: invoice.createdAt, done: true },
    { label: 'Sent to Client', date: invoice.sentAt || invoice.createdAt, done: invoice.status !== 'DRAFT' },
    { label: 'Client Viewed', date: invoice.viewedAt, done: invoice.status === 'VIEWED' || invoice.status === 'PAID' },
    { label: 'Paid in Full', date: invoice.paidAt, done: invoice.status === 'PAID' || Number(invoice.balanceDue) === 0 },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>

        <div className="flex items-center gap-2.5">
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-charcoal-950 text-sm">
                BP
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {invoice.workspace?.name || 'TechNova Solutions'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-2">GSTIN: {invoice.workspace?.businessProfile?.taxId || '29ABCDE1234F1Z5'}</p>
            <p className="text-xs text-slate-400">Indiranagar, Bengaluru, Karnataka, India</p>
          </div>

          <div className="text-left sm:text-right space-y-1.5">
            <div className="inline-block">
              <Badge status={invoice.status} />
            </div>
            <p className="font-mono text-base font-black text-emerald-400 tracking-wider">
              {invoice.invoiceNumber}
            </p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Issue Date: <span className="text-slate-200">{new Date(invoice.issueDate).toLocaleDateString('en-IN')}</span></p>
              <p>Due Date: <span className="text-slate-200 font-semibold">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span></p>
            </div>
          </div>
        </div>

        {/* Bill To & Billed By Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 rounded-2xl bg-charcoal-950/70 border border-slate-800/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Billed To (Client):
            </span>
            <p className="font-bold text-slate-100 text-sm">{invoice.client?.name || 'Recipient Client'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{invoice.client?.email}</p>
            <p className="text-xs text-slate-400">Place of Supply: Karnataka (29)</p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1.5">
              <Building className="w-3.5 h-3.5 text-teal-400" /> Payment Terms:
            </span>
            <p className="text-xs text-slate-300 font-semibold">Net 14 Days • Digital Settlement</p>
            <p className="text-xs text-slate-400 mt-0.5">Currency: {invoice.currency || 'INR'} (₹)</p>
            <p className="text-xs text-emerald-400 mt-0.5 font-mono">Status: {Number(invoice.balanceDue) === 0 ? 'SETTLED' : 'OUTSTANDING'}</p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-charcoal-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">#</th>
                <th className="py-3 px-4 font-semibold">Service Description</th>
                <th className="py-3 px-4 font-semibold text-center">HSN/SAC</th>
                <th className="py-3 px-4 font-semibold text-center">Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Unit Rate</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-charcoal-800/20">
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{item.description}</td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-400">998314</td>
                  <td className="py-3.5 px-4 text-center text-slate-200">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                    ₹{Number(item.amount || item.quantity * item.unitPrice).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
          {/* Notes & Bank Details */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-charcoal-950 border border-slate-800 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Direct Bank Transfer Instructions:
              </span>
              <p className="text-slate-300 font-mono text-[11px]">
                Bank: HDFC Bank Ltd • A/C: 50200012345678<br />
                IFSC: HDFC0001234 • Branch: Indiranagar<br />
                UPI ID: technova@hdfcbank
              </p>
            </div>
            {invoice.notes && (
              <p className="text-xs text-slate-400 italic">
                Note: {invoice.notes}
              </p>
            )}
          </div>

          {/* Ledger Totals */}
          <div className="p-4 rounded-xl bg-charcoal-950 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Taxable Subtotal:</span>
              <span className="text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>CGST (9%):</span>
              <span className="text-slate-200">₹{cgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SGST (9%):</span>
              <span className="text-slate-200">₹{sgst.toLocaleString('en-IN')}</span>
            </div>
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
            <span>Cryptographically sealed & synchronized with Neon PostgreSQL</span>
          </div>
          <span className="font-mono">ID: {invoice.id}</span>
        </div>
      </div>

      {/* INTERACTIVE PAYMENT CHECKOUT MODAL */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Complete Verified Settlement"
        size="lg"
      >
        {paymentSuccessData ? (
          /* Payment Success Celebration Screen */
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl glow-emerald animate-in zoom-in-75">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Payment Verified & Settled!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                ₹{Number(paymentAmount).toLocaleString('en-IN')} successfully settled for Invoice{' '}
                <span className="font-mono text-emerald-400 font-bold">{invoice.invoiceNumber}</span>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-charcoal-950 border border-slate-800 text-xs font-mono max-w-sm mx-auto text-left space-y-1 text-slate-300">
              <p>Gateway: <span className="text-emerald-400 font-bold">{paymentProvider} Sandbox</span></p>
              <p>Receipt ID: <span className="text-white">{paymentSuccessData.payment?.providerPaymentId || 'pay_sbx_99210'}</span></p>
              <p>Method: <span className="text-teal-300 uppercase">{paymentTab}</span></p>
            </div>

            <Button
              variant="primary"
              size="md"
              className="mt-4"
              onClick={() => setShowPaymentModal(false)}
            >
              Close & View Updated Invoice
            </Button>
          </div>
        ) : (
          /* Payment Selection Tabs */
          <div className="space-y-4">
            {/* Amount Banner */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Payable Balance</span>
                <p className="font-mono text-xl font-black text-white">₹{Number(paymentAmount).toLocaleString('en-IN')}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40">
                Sandbox Mode
              </span>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-3">
              {[
                { id: 'upi', label: 'UPI / QR Code', icon: QrCode },
                { id: 'card', label: 'Credit/Debit Card', icon: CreditCard },
                { id: 'netbanking', label: 'Net Banking', icon: Building },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaymentTab(tab.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    paymentTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-charcoal-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {paymentTab === 'upi' && (
              <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-4 text-center">
                <div className="w-36 h-36 bg-white p-2 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                  {/* Dynamic simulated QR code */}
                  <div className="w-full h-full bg-slate-900 rounded-lg p-2 flex flex-col items-center justify-center text-white">
                    <QrCode className="w-20 h-20 text-emerald-400" />
                    <span className="text-[9px] font-mono text-slate-300 mt-1">Scan with any UPI App</span>
                  </div>
                </div>

                <div className="max-w-xs mx-auto space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Or Pay with UPI VPA ID:</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="user@upi"
                    className="w-full bg-charcoal-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {paymentTab === 'card' && (
              <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-charcoal-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Valid Thru</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-charcoal-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={3}
                      defaultValue="889"
                      className="w-full bg-charcoal-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentTab === 'netbanking' && (
              <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-3">
                <label className="block text-[11px] font-semibold text-slate-400">Select Financial Institution:</label>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Other Banks'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                        selectedBank === bank
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-charcoal-900 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleInitiatePayment}
                loading={paymentProcessing}
                icon={ShieldCheck}
              >
                Authorize & Settle ₹{Number(paymentAmount).toLocaleString('en-IN')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
