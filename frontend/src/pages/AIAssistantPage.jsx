import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { aiApi } from '../api/ai.api.js';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  AlertCircle,
  Edit3,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Volume2,
  TrendingUp,
  CreditCard,
  User,
  ArrowRight,
} from 'lucide-react';

/**
 * Custom renderer for structured workflow execution results.
 */
const WorkflowResultCard = ({ operation, result }) => {
  if (!result) return null;

  // 1. Dashboard summary
  if (operation === 'GET_DASHBOARD_SUMMARY') {
    const fin = result.metrics?.financial || {};
    const inv = result.metrics?.invoices || {};
    const pay = result.metrics?.payments || {};
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Business Dashboard Summary</span>
          <span className="ml-auto text-[10px] font-semibold text-slate-500 uppercase">{result.period || 'All time'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block">Total Invoiced</span>
            <span className="font-bold text-slate-900 text-sm">₹{Number(fin.totalInvoicedAmount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block">Total Collected</span>
            <span className="font-bold text-emerald-600 text-sm">₹{Number(fin.totalCapturedAmount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block">Outstanding</span>
            <span className="font-bold text-amber-600 text-sm">₹{Number(fin.totalOutstandingAmount || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-1">
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Total Invoices: <strong>{inv.total ?? 0}</strong></span>
          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Paid: <strong>{inv.paid ?? 0}</strong></span>
          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">Pending: <strong>{inv.sent ?? 0}</strong></span>
          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">Overdue: <strong>{inv.overdue ?? 0}</strong></span>
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">Payments: <strong>{pay.successfulCount ?? 0}</strong></span>
        </div>
      </div>
    );
  }

  // 2. Aggregated Payment Summary
  if (operation === 'GET_PAYMENT_SUMMARY') {
    const { period, totalCollected, currency, paymentCount, providerBreakdown, outstanding, recentPayments } = result;
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Payment Summary</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase">{period}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Verified Collections</span>
            <span className="font-bold text-emerald-600 text-base">
              ₹{Number(totalCollected || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{paymentCount || 0} successful transaction(s)</span>
          </div>
          {outstanding && (
            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Current Outstanding</span>
              <span className="font-bold text-amber-600 text-base">
                ₹{Number(outstanding.total || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{outstanding.invoiceCount || 0} pending invoice(s)</span>
            </div>
          )}
        </div>

        {providerBreakdown && providerBreakdown.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Provider Breakdown:</span>
            <div className="flex flex-wrap gap-2">
              {providerBreakdown.map((pb, idx) => (
                <span key={idx} className="bg-white px-2 py-1 rounded border border-slate-200 text-[11px] text-slate-700">
                  <strong className="text-slate-900">{pb.provider}:</strong> ₹{Number(pb.totalCollected).toLocaleString('en-IN')}
                </span>
              ))}
            </div>
          </div>
        )}

        {recentPayments && recentPayments.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Recent Transactions:</span>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {recentPayments.map((p, idx) => (
                <div key={idx} className="p-1.5 bg-white rounded border border-slate-200 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-800">{p.clientName || p.invoiceNumber || 'Payment'}</span>
                    {p.invoiceNumber && <span className="text-slate-400 ml-1.5 font-mono text-[10px]">({p.invoiceNumber})</span>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{new Date(p.date).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Client Payment Summary
  if (operation === 'GET_CLIENT_PAYMENT_SUMMARY') {
    const { client, summary, invoices, recentPayments } = result;
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Client: {client?.name || 'Client Details'}</span>
          </div>
          {client?.email && <span className="text-[10px] text-slate-500">{client.email}</span>}
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Total Billed</span>
              <span className="font-bold text-slate-900 text-xs">₹{Number(summary.totalBilled || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Total Paid</span>
              <span className="font-bold text-emerald-600 text-xs">₹{Number(summary.totalPaid || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Outstanding</span>
              <span className="font-bold text-amber-600 text-xs">₹{Number(summary.totalOutstanding || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {invoices && invoices.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Invoices ({invoices.length}):</span>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {invoices.map((inv, idx) => (
                <div key={idx} className="p-1.5 bg-white rounded border border-slate-200 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-mono font-semibold text-slate-800">{inv.invoiceNumber}</span>
                    <span className={`ml-2 text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      inv.status === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>{inv.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-700">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</span>
                    {Number(inv.balanceDue) > 0 && (
                      <span className="text-amber-600 text-[10px] ml-1.5 font-semibold">(Due: ₹{Number(inv.balanceDue).toLocaleString('en-IN')})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. Invoice Lists (LIST_INVOICES, LIST_PENDING_INVOICES, LIST_OVERDUE_INVOICES, etc.)
  const invoiceList = result.invoices || (Array.isArray(result) ? result : null);
  if (invoiceList && Array.isArray(invoiceList)) {
    if (invoiceList.length === 0) {
      return (
        <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <span>No matching invoices found in this view.</span>
        </div>
      );
    }
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          <span>Found {invoiceList.length} invoice(s):</span>
          {result.pagination?.total && <span>Total: {result.pagination.total}</span>}
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {invoiceList.map((inv, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs hover:bg-slate-100/70 transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                    inv.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' :
                    inv.status === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-800' :
                    inv.status === 'DRAFT' ? 'bg-slate-200 text-slate-700' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {inv.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>Client: <strong className="text-slate-700">{inv.clientName || inv.clientEmail || 'Client'}</strong></span>
                  {inv.dueDate && <span>• Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}</span>}
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 block">₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}</span>
                {Number(inv.balanceDue || 0) > 0 && (
                  <span className="text-[10px] text-amber-600 font-semibold block">
                    Bal: ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. Payment list (GET_PAYMENT_HISTORY)
  const paymentList = result.payments || (Array.isArray(result) ? result : null);
  if (paymentList && Array.isArray(paymentList)) {
    if (paymentList.length === 0) {
      return (
        <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <span>No payment records found.</span>
        </div>
      );
    }
    return (
      <div className="mt-3 space-y-2">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Payment Transactions ({paymentList.length}):
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {paymentList.map((p, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{p.invoice?.clientName || 'Payment'}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    p.status === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'FAILED' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {p.invoice?.invoiceNumber && <span className="font-mono mr-2">Inv: {p.invoice.invoiceNumber}</span>}
                  <span>Via {p.provider || 'Gateway'} • {new Date(p.createdAt || p.paymentDate).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-600 text-sm">₹{Number(p.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. Single Invoice Status / Details (GET_INVOICE_STATUS, GET_OUTSTANDING_BALANCE, GET_INVOICE)
  if (result.invoiceNumber || result.invoiceId || (result.status && result.balanceDue !== undefined)) {
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="font-mono font-bold text-slate-900 text-sm">{result.invoiceNumber || result.invoiceId}</span>
          </div>
          {result.status && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              result.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
              result.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              {result.status}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Total</span>
            <span className="font-bold text-slate-900">₹{Number(result.totalAmount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Paid</span>
            <span className="font-bold text-emerald-600">₹{Number(result.paidAmount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Balance Due</span>
            <span className="font-bold text-amber-600">₹{Number(result.balanceDue || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
        {result.clientName && (
          <div className="text-[11px] text-slate-500 pt-1">
            Client: <strong className="text-slate-700">{result.clientName}</strong>
          </div>
        )}
      </div>
    );
  }

  // 7. Message or Follow-up Draft
  if (result.type === 'PAYMENT_FOLLOWUP_DRAFT' || result.type === 'CLIENT_MESSAGE_DRAFT') {
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-200 pb-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Prepared Message Draft</span>
        </div>
        {result.recipient && (
          <div className="text-[11px] text-slate-600">
            Recipient: <strong className="text-slate-900">{result.recipient}</strong>
          </div>
        )}
        {result.subject && (
          <div className="text-[11px] text-slate-600">
            Subject: <strong className="text-slate-900">{result.subject}</strong>
          </div>
        )}
        <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 font-sans italic text-xs whitespace-pre-wrap">
          {result.message}
        </div>
      </div>
    );
  }

  return null;
};

export const AIAssistantPage = () => {
  const { user, activeWorkspace } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Namaste ${user?.name || 'Business Leader'}! I am your **Wealthra™ AI Business Operator**.\n\nYou can speak or type to me in **English, Hindi, or Hinglish** to draft invoices, check pending receivables, or query cashflow.\n\nTry asking:\n• *"Create an invoice of 15000 for client Acme Innovations for website development."*\n• *"How much money did I collect this month?"*\n• *"Show my pending invoices."*`,
      createdAt: new Date().toISOString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeDraft, setActiveDraft] = useState(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraft, setEditedDraft] = useState(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeDraft, isEditingDraft]);

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm',
        });
        if (audioBlob.size > 700 * 1024) {
          toast.error('Voice Recording Too Large', 'Please record a shorter message.');
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          await handleVoiceTranscription(base64Audio);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      toast.info('Voice Recording Started', 'Speak clearly in Hindi, Hinglish, or English...');
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      toast.error('Microphone Access Required', 'Please enable microphone permissions in your browser or type your prompt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleVoiceTranscription = async (audioBase64) => {
    setLoading(true);
    try {
      const res = await aiApi.transcribeVoice({
        audio: audioBase64,
        language: 'unknown',
      });
      if (res.success && res.data.transcript) {
        setInputText(res.data.transcript);
        toast.success('Voice Transcribed', `Recognized: "${res.data.transcript}"`);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      toast.error('Voice Transcription', 'Could not process audio. Please try typing your request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customPrompt) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
      })).slice(-8);

      const res = await aiApi.sendMessage(textToSend, historyPayload);
      const data = res?.data || res;

      if (data) {
        let content = '';
        if (data.status === 'clarification_required') {
          content = data.question || data.response || 'Please provide more details.';
        } else if (data.status === 'confirmation_required') {
          content = `⚠️ **Confirmation Required**: ${data.message || 'Please confirm before I proceed with this consequential action.'}`;
        } else if (data.status === 'executed') {
          if (data.operation === 'GET_DASHBOARD_SUMMARY') {
            const m = data.result?.metrics?.financial || {};
            content = `📊 **Business Summary retrieved.** Here is your current performance overview:`;
          } else if (data.operation === 'GET_PAYMENT_SUMMARY') {
            const total = Number(data.result?.totalCollected || 0).toLocaleString('en-IN');
            content = `💰 **Payment Summary for ${data.result?.period || 'the requested period'}:**\nYou collected **₹${total}** across ${data.result?.paymentCount || 0} transaction(s).`;
          } else if (data.operation === 'GET_CLIENT_PAYMENT_SUMMARY') {
            const clientName = data.result?.client?.name || 'Client';
            const paid = Number(data.result?.summary?.totalPaid || 0).toLocaleString('en-IN');
            const bal = Number(data.result?.summary?.totalOutstanding || 0).toLocaleString('en-IN');
            content = `👤 **Client Financial Summary for ${clientName}:**\nTotal Paid: **₹${paid}** | Outstanding: **₹${bal}**`;
          } else if (data.operation === 'LIST_PENDING_INVOICES') {
            const count = data.result?.invoices?.length ?? (Array.isArray(data.result) ? data.result.length : 0);
            content = count > 0
              ? `📋 **Pending Invoices:** Found ${count} invoice(s) awaiting payment:`
              : `✅ **No pending invoices found.** All invoices are clear!`;
          } else if (data.operation === 'LIST_OVERDUE_INVOICES') {
            const count = data.result?.invoices?.length ?? (Array.isArray(data.result) ? data.result.length : 0);
            content = count > 0
              ? `⚠️ **Overdue Invoices:** Found ${count} invoice(s) past due date:`
              : `🎉 **No overdue invoices found!** All active invoices are within their payment terms.`;
          } else if (data.operation === 'LIST_INVOICES' || data.operation === 'GET_CLIENT_INVOICES') {
            const count = data.result?.invoices?.length ?? (Array.isArray(data.result) ? data.result.length : 0);
            content = count > 0
              ? `📄 **Invoice Records:** Found ${count} invoice(s):`
              : `📄 No matching invoices found.`;
          } else if (data.operation === 'GET_INVOICE_STATUS' || data.operation === 'GET_OUTSTANDING_BALANCE') {
            const inv = data.result || {};
            content = `📄 **Invoice ${inv.invoiceNumber || inv.invoiceId}:** Status is **${inv.status}** with balance due of **₹${Number(inv.balanceDue || 0).toLocaleString('en-IN')}**.`;
          } else if (data.operation === 'CREATE_INVOICE_DRAFT') {
            content = `✅ **Invoice Draft Created!**\nInvoice **${data.result?.invoiceNumber}** for ₹${Number(data.result?.totalAmount || 0).toLocaleString('en-IN')} has been generated in your account.`;
          } else if (data.operation === 'SEND_INVOICE') {
            content = `📧 **Invoice Sent!** The invoice has been dispatched to the client.`;
          } else if (data.operation === 'CANCEL_INVOICE') {
            content = `🚫 **Invoice Cancelled!** The invoice was marked as cancelled.`;
          } else if (data.operation === 'GET_PAYMENT_HISTORY') {
            const count = data.result?.payments?.length ?? (Array.isArray(data.result) ? data.result.length : 0);
            content = `💳 **Payment History:** Retrieved ${count} transaction record(s):`;
          } else {
            content = `✅ Action **${data.operation}** completed successfully.`;
          }
        } else {
          content = data.response || data.aiResponse?.response || 'I am ready to help you manage your business.';
        }

        const aiMsg = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content,
          status: data.status,
          operation: data.operation,
          input: data.input,
          result: data.result,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMsg]);

        if (data.status === 'confirmation_required') {
          const draftParams = data.input || {};
          const formattedDraft = {
            operation: data.operation,
            input: draftParams,
            clientName: draftParams.clientName || draftParams.name || 'Billed Client',
            clientEmail: draftParams.clientEmail || draftParams.email || '',
            items: draftParams.items && draftParams.items.length > 0
              ? draftParams.items.map(it => ({ ...it, quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) || Number(it.price || 0) }))
              : [{ description: draftParams.description || 'Professional Services', quantity: 1, unitPrice: Number(draftParams.amount || 0) }],
            dueDate: draftParams.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            taxRate: 18,
            subtotal: Number(draftParams.amount || 0),
            taxAmount: (Number(draftParams.amount || 0) * 0.18),
            totalAmount: (Number(draftParams.amount || 0) * 1.18),
          };
          setActiveDraft(formattedDraft);
          setEditedDraft(JSON.parse(JSON.stringify(formattedDraft)));
          setIsEditingDraft(false);
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
      const requestSuffix = err.requestId ? ` (Request ID: ${err.requestId})` : '';
      toast.error(
        'AI Processing Error',
        `${err.message || 'Error processing request.'}${requestSuffix}`,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${err.message || 'Error processing request.'}`,
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Live draft math
  const calculateDraftTotals = (draftObj) => {
    if (!draftObj) return { subtotal: 0, taxAmount: 0, totalAmount: 0 };
    const items = draftObj.items || [];
    const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.unitPrice || 0)), 0);
    const taxRate = Number(draftObj.taxRate !== undefined ? draftObj.taxRate : 18);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  // Draft editing handlers
  const handleItemFieldChange = (idx, field, val) => {
    if (!editedDraft) return;
    const updatedItems = [...editedDraft.items];
    updatedItems[idx][field] = val;
    const totals = calculateDraftTotals({ ...editedDraft, items: updatedItems });
    setEditedDraft({
      ...editedDraft,
      items: updatedItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    });
  };

  const handleAddItem = () => {
    if (!editedDraft) return;
    const updatedItems = [...editedDraft.items, { description: 'Additional Item', quantity: 1, unitPrice: 1000 }];
    const totals = calculateDraftTotals({ ...editedDraft, items: updatedItems });
    setEditedDraft({
      ...editedDraft,
      items: updatedItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    });
  };

  const handleRemoveItem = (idx) => {
    if (!editedDraft || editedDraft.items.length <= 1) return;
    const updatedItems = editedDraft.items.filter((_, i) => i !== idx);
    const totals = calculateDraftTotals({ ...editedDraft, items: updatedItems });
    setEditedDraft({
      ...editedDraft,
      items: updatedItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    });
  };

  // User confirms the invoice draft or consequential workflow
  const handleConfirmDraft = async (confirmed) => {
    if (!activeDraft?.operation) return;
    setExecutingAction(true);

    try {
      const draftData = isEditingDraft && editedDraft ? editedDraft : activeDraft;
      if (confirmed) {
        const inputData = {
          ...(activeDraft.input || {}),
          items: draftData.items,
          dueDate: draftData.dueDate,
        };
        const res = await aiApi.executeWorkflow(activeDraft.operation, inputData, true);
        toast.success(
          'Action Executed',
          `Operation ${activeDraft.operation} completed successfully.`
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `exec_${Date.now()}`,
            role: 'assistant',
            content: `✅ **Confirmed & Executed**: ${activeDraft.operation} has been successfully applied to your database.`,
            createdAt: new Date().toISOString(),
          }
        ]);
      } else {
        toast.info('Action Discarded', `The action was cancelled per your instruction.`);
        setMessages((prev) => [
          ...prev,
          {
            id: `exec_${Date.now()}`,
            role: 'assistant',
            content: `❌ The requested action was discarded.`,
            createdAt: new Date().toISOString(),
          }
        ]);
      }
      setActiveDraft(null);
      setEditedDraft(null);
      setIsEditingDraft(false);
    } catch (err) {
      console.error('Action execution failed:', err);
      toast.error('Execution Failed', err.message || 'Failed to execute action.');
    } finally {
      setExecutingAction(false);
    }
  };

  const presetPrompts = [
    { label: 'Create Invoice for Client', text: 'Create ₹15,000 invoice for website development and UI design', cat: 'billing' },
    { label: 'Check Month Revenue', text: 'How much money did I collect this month?', cat: 'analytics' },
    { label: 'Show Pending Invoices', text: 'Show my pending invoices', cat: 'analytics' },
    { label: 'Check Overdue Accounts', text: 'Which clients have overdue payments?', cat: 'analytics' },
    { label: 'Business Summary', text: 'Give me my business summary', cat: 'analytics' },
  ];

  const filteredPresets = activeCategory === 'all'
    ? presetPrompts
    : presetPrompts.filter(p => p.cat === activeCategory);

  const displayDraft = isEditingDraft && editedDraft ? editedDraft : activeDraft;
  const draftTotals = displayDraft ? calculateDraftTotals(displayDraft) : { subtotal: 0, taxAmount: 0, totalAmount: 0 };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col bg-white rounded-3xl border border-[#E8E4DC] overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 px-6 border-b border-[#E8E4DC] bg-[#FAF8F5] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1C1D22] text-white flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-5 h-5 text-[#F5C869]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1C1D22] flex items-center gap-2">
              Wealthra™ AI Business Operator
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Sarvam Saaras & Gemini
              </span>
            </h2>
            <p className="text-[11px] text-[#8E9297] font-medium">
              Multilingual Voice & Text Assistant (English • Hindi • Hinglish)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-xl bg-white border border-[#E8E4DC] text-[#1C1D22] font-bold">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          <button
            onClick={() => {
              setMessages([
                {
                  id: 'welcome_reset',
                  role: 'assistant',
                  content: `Chat session refreshed. What can I do for your business today?`,
                  createdAt: new Date().toISOString(),
                }
              ]);
              setActiveDraft(null);
              toast.info('Chat Cleared', 'Conversation session restarted.');
            }}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-[#1C1D22] border border-[#E8E4DC] transition"
            title="Restart conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#FDFCFB]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-[#1C1D22] text-white'
                  : 'bg-[#CFDDC8] text-[#1A3018]'
              }`}
            >
              {msg.role === 'user' ? (user?.name?.slice(0, 1) || 'U') : <Sparkles className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1C1D22] text-white rounded-tr-none shadow-xs'
                  : 'bg-white border border-[#E8E4DC] text-[#1C1D22] rounded-tl-none shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">
                {msg.content}
              </div>

              {/* Structured Workflow Result Card (Invoices, Overdue, Payments, Dashboard) */}
              {msg.result && (
                <WorkflowResultCard operation={msg.operation} result={msg.result} />
              )}
            </div>
          </div>
        ))}

        {/* Live Interactive Draft Preview & In-line Editor */}
        {activeDraft && (
          <div className="max-w-2xl bg-charcoal-900 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl glow-emerald animate-in zoom-in-95 ml-11">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Invoice Draft Confirmation Required</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDraft(!isEditingDraft)}
                  className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition ${
                    isEditingDraft
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                      : 'bg-charcoal-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingDraft ? 'Done Editing' : 'Edit Values'}
                </button>
                <span className="text-[11px] bg-amber-500/15 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Pending Auth
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <span className="text-slate-400">Recipient Client:</span>
                <p className="font-bold text-slate-100 text-sm mt-0.5">{displayDraft.clientName}</p>
              </div>
              <div>
                <span className="text-slate-400">Due Date:</span>
                {isEditingDraft ? (
                  <input
                    type="date"
                    value={displayDraft.dueDate}
                    onChange={(e) => setEditedDraft({ ...editedDraft, dueDate: e.target.value })}
                    className="w-full mt-1 bg-charcoal-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                ) : (
                  <p className="font-semibold text-slate-200 mt-0.5">{displayDraft.dueDate}</p>
                )}
              </div>
            </div>

            {/* Line items table / editor */}
            <div className="rounded-xl bg-charcoal-950 p-3 mb-4 border border-slate-800">
              <div className="flex justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800">
                <span>Description & Qty</span>
                <span>Amount</span>
              </div>

              {(displayDraft.items || []).map((it, idx) => (
                <div key={idx} className="py-2 border-b border-slate-800/60 last:border-0 text-xs">
                  {isEditingDraft ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 bg-charcoal-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                        className="w-14 bg-charcoal-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs text-center"
                      />
                      <span className="text-slate-500">× ₹</span>
                      <input
                        type="number"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => handleItemFieldChange(idx, 'unitPrice', e.target.value)}
                        className="w-24 bg-charcoal-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs text-right font-mono"
                      />
                      {displayDraft.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-200">
                      <span>{it.description} <span className="text-slate-400">(x{it.quantity})</span></span>
                      <span className="font-mono">₹{(Number(it.quantity || 1) * Number(it.unitPrice || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              ))}

              {isEditingDraft && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add line item
                </button>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3 mb-5">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">₹{draftTotals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400 items-center">
                <span>GST (18%):</span>
                <span className="font-mono text-slate-200">₹{draftTotals.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1.5 border-t border-slate-800">
                <span>Grand Total:</span>
                <span className="font-mono">₹{draftTotals.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleConfirmDraft(false)}
                disabled={executingAction}
                icon={XCircle}
              >
                Discard Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConfirmDraft(true)}
                loading={executingAction}
                icon={CheckCircle2}
              >
                Confirm & Create Invoice (₹{draftTotals.totalAmount.toLocaleString('en-IN')})
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="p-3.5 rounded-2xl bg-charcoal-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Processing financial parameters & executing ledger lookup...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Action Chips with Category Pills */}
      <div className="px-6 py-2.5 bg-charcoal-900/70 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1">
          Suggestions:
        </span>
        {filteredPresets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.text)}
            className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-charcoal-800 hover:bg-emerald-500/15 hover:text-emerald-300 text-slate-300 border border-slate-700/60 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Bar with Animated Waveform Equalizer */}
      <div className="p-4 bg-charcoal-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2.5"
        >
          {/* Voice Microphone Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-xl border transition flex items-center justify-center shrink-0 ${
              isRecording
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/40'
                : 'bg-charcoal-800 hover:bg-charcoal-700 text-slate-300 border-slate-700/60'
            }`}
            title={isRecording ? 'Click to stop voice recording' : 'Click to speak in Hindi/English'}
          >
            {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </button>

          {isRecording ? (
            <div className="flex-1 bg-charcoal-950 border border-rose-500/50 rounded-xl px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-semibold">Listening ({recordingTime}s)...</span>

                {/* Animated Audio Equalizer Waveform */}
                <div className="flex items-center gap-0.5 h-5">
                  {[40, 75, 55, 95, 60, 85, 30, 90, 65, 45, 80, 50].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-rose-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.max(20, (h * ((recordingTime % 3) + 1)) % 100)}%`,
                        animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={stopRecording}
                className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-lg transition"
              >
                Done & Transcribe
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak or type: 'Create an invoice for 15,000 for website design'..."
              className="flex-1 bg-charcoal-950 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition"
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputText.trim() || loading}
            icon={Send}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};
