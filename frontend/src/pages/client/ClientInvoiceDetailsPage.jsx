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
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.getInvoice(id);
      const inv = res?.data || res;
      if (inv) {
        setInvoice(inv);
        setPaymentAmount(String(inv.balanceDue ?? inv.totalAmount ?? '0'));
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
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay Checkout SDK. Please check your internet connection.');
      }

      const idempotencyKey = `idemp_${invoice.id}_${Date.now()}`;
      const orderRes = await paymentsApi.createOrder(invoice.id, {
        amount: Number(paymentAmount),
        idempotencyKey,
      });

      const orderData = orderRes?.data || orderRes;
      const keyId = orderData?.keyId || orderRes?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      const orderId = orderData?.orderId || orderRes?.orderId;

      if (!orderId) {
        throw new Error('Payment gateway order could not be generated.');
      }

      const merchantName =
        invoice.businessUser?.businessProfile?.businessName ||
        invoice.businessUser?.fullName ||
        'Wealthra™ Merchant';

      const options = {
        key: keyId,
        amount: Math.round(Number(paymentAmount) * 100),
        currency: invoice.currency || 'INR',
        name: merchantName,
        description: `Settlement for Invoice ${invoice.invoiceNumber}`,
        order_id: orderId,
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
          },
        },
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
          } finally {
            setPaymentProcessing(false);
          }
        },
        prefill: {
  name: user?.fullName || invoice.clientUser?.fullName || 'Client User',
  email: user?.email || invoice.clientEmail || '',
},
hidden: {
  contact: true,
},
theme: { color: '#17A673' },
      };

      const handleCreateDummySession = async () => {
        setPaymentProcessing(true);
        try {
          const response = await paymentsApi.createDummySession(invoice.id);
          const created = response?.data || response;
          window.location.assign(created.paymentUrl);
        } catch (err) {
          toast.error('Demo Payment Error', err.message || 'Could not open the demo payment page.');
        } finally {
          setPaymentProcessing(false);
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        toast.error('Payment Failed', resp.error?.description || 'Transaction declined.');
        setPaymentProcessing(false);
      });
      rzp.open();
    } catch (err) {
      toast.error('Payment Error', err.message || 'Payment processing failed.');
      setPaymentProcessing(false);
    }
  };
const handleCreateDummySession = async () => {
  if (!invoice?.id) {
    toast.error('Invoice information is unavailable.');
    return;
  }

  setPaymentProcessing(true);

  try {
    const response = await paymentsApi.createDummySession(invoice.id);

    // Support both Axios responses and unwrapped API responses.
    const session =
      response?.data?.data ??
      response?.data ??
      response?.data?.result ??
      response?.data ??
      response;

    if (!session?.paymentUrl) {
      throw new Error('Demo payment link was not returned by the server.');
    }

    const paymentUrl = new URL(session.paymentUrl, window.location.origin);

    // Only allow navigation to the configured frontend origin.
    if (paymentUrl.origin !== window.location.origin) {
      throw new Error('Invalid demo payment URL.');
    }

    navigate(`${paymentUrl.pathname}${paymentUrl.search}${paymentUrl.hash}`);
  } catch (err) {
    console.error('Failed to create demo payment session:', err);
    toast.error(
      err?.response?.data?.message ||
      err.message ||
      'Unable to create demo payment session.'
    );
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
            onClick={() =>
              navigate(
                `/portal/messages?recipient=${encodeURIComponent(invoice.businessUserId)}`
              )
            }
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
              <div className="w-8 h-8 rounded-xl bg-[#1C1D22] text-white flex items-center justify-center font-bold text-xs">
                {(invoice.businessUser?.businessProfile?.businessName || invoice.businessUser?.fullName || 'B').charAt(0)}
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {invoice.businessUser?.businessProfile?.businessName || invoice.businessUser?.fullName || 'Issuing Business'}
              </h2>
            </div>
            {invoice.businessUser?.businessProfile?.taxId && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                GSTIN: {invoice.businessUser.businessProfile.taxId}
              </p>
            )}
            {invoice.businessUser?.businessProfile?.city && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {invoice.businessUser.businessProfile.city}, {invoice.businessUser.businessProfile.country || 'India'}
              </p>
            )}
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
            {invoice.notes && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Vendor Notes & Instructions:
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                  {invoice.notes}
                </p>
              </div>
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

        {/* Official Vendor Bank Settlement & Beneficiary Details */}
        {invoice.businessUser?.businessProfile && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/70 dark:bg-charcoal-950/60 space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-primary" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Vendor Bank Settlement Credentials
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-primary font-bold border border-emerald-500/20">
                Verified Business Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Beneficiary / Account</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-0.5 truncate">
                  {invoice.businessUser.businessProfile.bankAccountName ||
                   invoice.businessUser.businessProfile.businessName ||
                   invoice.businessUser.fullName}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Bank Name</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                  {invoice.businessUser.businessProfile.bankName || 'Verified Bank Account'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Account Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5 tracking-wider">
                  {invoice.businessUser.businessProfile.bankAccountNumber || 'Settlement via Gateway'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">IFSC Code</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5 tracking-wider">
                  {invoice.businessUser.businessProfile.bankIfscCode || '—'}
                </span>
              </div>
            </div>

            {invoice.businessUser.businessProfile.upiId && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-primary" />
                  <span className="text-slate-500">Official UPI ID:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {invoice.businessUser.businessProfile.upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(invoice.businessUser.businessProfile.upiId);
                    toast.success('Vendor UPI ID copied to clipboard');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-charcoal-800 hover:bg-slate-200 dark:hover:bg-charcoal-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            )}

            {invoice.businessUser.businessProfile.paymentInstructions && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                Settlement Instructions: {invoice.businessUser.businessProfile.paymentInstructions}
              </p>
            )}
          </div>
        )}
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
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-surface-light dark:via-charcoal-900 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-primary tracking-wider">Settlement Amount</span>
                <p className="font-mono text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  ₹{Number(paymentAmount).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Invoice {invoice.invoiceNumber} • Due {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-primary font-semibold border border-emerald-500/30">
                Razorpay Secured
              </span>
            </div>

            {/* Official Business Owner Bank Settlement Details */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-charcoal-950/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-primary" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Business Owner Bank Credentials
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-emerald-primary">
                  Recipient Account
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-medium">Beneficiary Name</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                    {invoice.businessUser?.businessProfile?.bankAccountName ||
                     invoice.businessUser?.businessProfile?.businessName ||
                     invoice.businessUser?.fullName ||
                     'Authorized Merchant'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-medium">Bank Name</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                    {invoice.businessUser?.businessProfile?.bankName || 'Direct Clearing / UPI'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-medium">Account Number</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {invoice.businessUser?.businessProfile?.bankAccountNumber || 'Settlement via Gateway'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-medium">IFSC Code</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {invoice.businessUser?.businessProfile?.bankIfscCode || '—'}
                  </span>
                </div>
              </div>

              {invoice.businessUser?.businessProfile?.upiId && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-primary" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Vendor UPI ID</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {invoice.businessUser.businessProfile.upiId}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(invoice.businessUser.businessProfile.upiId);
                      toast.success('Vendor UPI ID copied to clipboard');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-charcoal-800 hover:bg-slate-200 dark:hover:bg-charcoal-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
              )}

              {invoice.businessUser?.businessProfile?.paymentInstructions && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                  Settlement Note: {invoice.businessUser.businessProfile.paymentInstructions}
                </p>
              )}
            </div>

            {/* Instant Gateway Settlement Trigger */}
            <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-primary" /> Instant Settlement via Razorpay
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pay securely using any UPI app (Google Pay, PhonePe, Paytm), Debit/Credit Card, or NetBanking.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full text-xs font-bold shadow-md"
                onClick={handleInitiatePayment}
                loading={paymentProcessing}
                icon={ShieldCheck}
              >
                Launch Razorpay Checkout (₹{Number(paymentAmount).toLocaleString('en-IN')})
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full text-xs font-bold"
                onClick={handleCreateDummySession}
                loading={paymentProcessing}
                icon={QrCode}
              >
                Open Demo Payment (No Money)
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-primary" />
                <span>256-bit SSL Encrypted • Direct Bank Settlement</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentProcessing}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
