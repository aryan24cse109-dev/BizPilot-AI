import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { invoicesApi } from '../../api/invoices.api.js';
import { paymentsApi } from '../../api/payments.api.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import {
  FileText,
  Download,
  CreditCard,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  QrCode,
  Smartphone,
  Copy,
  Printer
} from 'lucide-react';

export const ClientInvoiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment checkout state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTab, setPaymentTab] = useState('upi'); // 'upi', 'card', 'netbanking'
  const [paymentProvider, setPaymentProvider] = useState('RAZORPAY');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [upiId, setUpiId] = useState('client@upi');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
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
      setError(err.message || 'Invoice record not found.');
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
          name: invoice.businessUser?.businessProfile?.businessName || 'BizPilot AI Business',
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
            name: user?.fullName || 'Client User',
            email: user?.email || '',
          },
          theme: { color: '#17A673' },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.info(
          'Payment Order Prepared',
          `Order ${orderData?.orderId || 'created'} registered with gateway.`
        );
      }
    } catch (err) {
      toast.error('Payment Error', err.message || 'Payment processing failed.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading invoice breakdown..." />;

  if (error || !invoice) {
    return (
      <div className="saas-card p-6 border border-rose-500/30 bg-rose-500/5 text-rose-500 max-w-xl mx-auto mt-10">
        <p className="font-bold text-sm">Error Loading Invoice</p>
        <p className="text-xs mt-1 text-slate-500">{error || 'Invoice not found.'}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/portal/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const subtotal = Number(invoice.subtotal || invoice.totalAmount / 1.18);
  const taxAmount = Number(invoice.taxAmount || invoice.totalAmount - subtotal);
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  const canPay = Number(invoice.balanceDue) > 0 && invoice.status !== 'DRAFT';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/portal/invoices')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Invoices
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={MessageSquare}
            onClick={() => navigate(`/portal/messages?invoiceNumber=${invoice.invoiceNumber}`)}
          >
            Contact Vendor
          </Button>

          <a
            href={invoicesApi.downloadPdfUrl(invoice.id)}
            download={`Invoice-${invoice.invoiceNumber}.pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-charcoal-800 hover:text-emerald-primary text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" /> PDF
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
              Pay ₹{Number(invoice.balanceDue).toLocaleString('en-IN')}
            </Button>
          )}
        </div>
      </div>

      {/* Prominent Payment Banner if Due */}
      {canPay && (
        <div className="saas-card p-5 bg-gradient-to-r from-emerald-500/10 via-surface-light dark:via-charcoal-900 to-teal-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-primary uppercase tracking-wider block">
              Payment Awaiting Settlement
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              ₹{Number(invoice.balanceDue).toLocaleString('en-IN')} due by {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={CreditCard}
            onClick={() => {
              setShowPaymentModal(true);
              setPaymentSuccessData(null);
            }}
          >
            Pay Now
          </Button>
        </div>
      )}

      {/* Formal Tax Invoice Document Card */}
      <div className="saas-card p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 bg-surface-light dark:bg-charcoal-900">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-primary text-white flex items-center justify-center font-bold text-xs">
                TN
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {invoice.workspace?.name || 'TechNova Solutions'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              GSTIN: {invoice.workspace?.businessProfile?.taxId || '29ABCDE1234F1Z5'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Bengaluru, Karnataka, India</p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="inline-block">
              <Badge status={invoice.status} />
            </div>
            <p className="font-mono text-base font-black text-emerald-primary tracking-wider">
              {invoice.invoiceNumber}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Issue Date: {new Date(invoice.issueDate).toLocaleDateString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Due Date: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-charcoal-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">#</th>
                <th className="py-3 px-4 font-semibold">Service Description</th>
                <th className="py-3 px-4 font-semibold text-center">Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Unit Rate</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(invoice.items || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/20">
                  <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{item.description}</td>
                  <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                    ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    ₹{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
          <div className="space-y-2 max-w-sm">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Vendor Payment Instructions:
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                UPI: technova@hdfcbank<br />
                Netbanking: HDFC0001234 A/C 50200012345678
              </p>
            </div>
            {invoice.notes && (
              <p className="text-xs text-slate-500 italic">Note: {invoice.notes}</p>
            )}
          </div>

          <div className="w-full sm:w-72 p-4 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="text-slate-900 dark:text-slate-100">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>CGST (9%):</span>
              <span className="text-slate-900 dark:text-slate-100">₹{cgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>SGST (9%):</span>
              <span className="text-slate-900 dark:text-slate-100">₹{sgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-900 dark:text-white font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Total Amount:</span>
              <span>₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-primary font-bold text-sm pt-1">
              <span>Remaining Balance:</span>
              <span>₹{Number(invoice.balanceDue).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Payment Checkout Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Complete Verified Payment"
        size="lg"
      >
        {paymentSuccessData ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-primary border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment Verified Successfully</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ₹{Number(paymentAmount).toLocaleString('en-IN')} was settled for Invoice {invoice.invoiceNumber}.
            </p>
            <Button
              variant="primary"
              size="md"
              className="mt-4"
              onClick={() => setShowPaymentModal(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-primary tracking-wider">Payable Balance</span>
                <p className="font-mono text-xl font-black text-slate-900 dark:text-white">₹{Number(paymentAmount).toLocaleString('en-IN')}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-primary font-semibold border border-emerald-500/30">
                Sandbox Mode
              </span>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              {[
                { id: 'upi', label: 'UPI / QR Code', icon: QrCode },
                { id: 'card', label: 'Debit/Credit Card', icon: CreditCard },
                { id: 'netbanking', label: 'Net Banking', icon: Building },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaymentTab(tab.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    paymentTab === tab.id
                      ? 'bg-emerald-primary/10 text-emerald-primary border border-emerald-primary/40'
                      : 'bg-slate-100 dark:bg-charcoal-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {paymentTab === 'upi' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto flex items-center justify-center shadow-md">
                  <div className="w-full h-full bg-slate-900 rounded p-2 flex flex-col items-center justify-center text-white">
                    <QrCode className="w-16 h-16 text-emerald-400" />
                    <span className="text-[8px] font-mono mt-1">Scan via UPI</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full max-w-xs mx-auto bg-slate-100 dark:bg-charcoal-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-center text-slate-900 dark:text-white"
                  placeholder="Enter UPI ID (e.g. user@okhdfc)"
                />
              </div>
            )}

            {paymentTab === 'card' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-charcoal-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  placeholder="Card Number"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-charcoal-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                    placeholder="MM/YY"
                  />
                  <input
                    type="password"
                    maxLength={3}
                    defaultValue="889"
                    className="w-full bg-slate-100 dark:bg-charcoal-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                    placeholder="CVV"
                  />
                </div>
              </div>
            )}

            {paymentTab === 'netbanking' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBank(b)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                      selectedBank === b
                        ? 'bg-emerald-primary/10 border-emerald-primary text-emerald-primary'
                        : 'bg-white dark:bg-charcoal-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                Pay & Settle ₹{Number(paymentAmount).toLocaleString('en-IN')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
