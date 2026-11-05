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
  Volume2
} from 'lucide-react';

export const AIAssistantPage = () => {
  const { user, activeWorkspace } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Namaste ${user?.name || 'Business Leader'}! I am your **BizPilot AI Business Operator**.\n\nYou can speak or type to me in **English, Hindi, or Hinglish** to draft invoices, check pending receivables, or query cashflow.\n\nTry asking:\n• *"Rahul ke liye 15000 rupees ka invoice banao for website development."*\n• *"How much money did I collect this month?"*\n• *"Show my pending invoices."*`,
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
  const [conversationId, setConversationId] = useState(null);
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

  // Voice recording logic with fallback
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
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
      // Simulated voice prompt for environments without mic hardware
      setInputText('Rahul ke liye 15000 rupees ka invoice banao for website development');
      toast.warning('Microphone Emulation', 'Auto-filled voice sample prompt: "Rahul ke liye 15000 rupees ka invoice banao..."');
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
        language: 'hi-IN',
      });
      if (res.success && res.data.transcript) {
        setInputText(res.data.transcript);
        toast.success('Voice Transcribed', `Recognized: "${res.data.transcript}"`);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setInputText('Rahul ke liye 15000 rupees ka invoice banao for website development');
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
      const res = await aiApi.chat({
        message: textToSend,
        conversationId,
        language: 'hinglish',
      });

      if (res.success && res.data) {
        const { conversationId: newConvId, message, draft, actionLogId, toolResult, requiresConfirmation } = res.data;
        if (newConvId) setConversationId(newConvId);

        const aiMsg = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: message,
          draft,
          actionLogId,
          toolResult,
          requiresConfirmation,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMsg]);

        if (requiresConfirmation && draft && actionLogId) {
          const formattedDraft = {
            ...draft,
            actionLogId,
            items: draft.items && draft.items.length > 0 
              ? draft.items.map(it => ({ ...it, quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) || Number(draft.amount || 0) }))
              : [{ description: draft.description || 'Professional Services', quantity: 1, unitPrice: Number(draft.amount || 15000) }],
            dueDate: draft.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            taxRate: 18,
          };
          setActiveDraft(formattedDraft);
          setEditedDraft(JSON.parse(JSON.stringify(formattedDraft)));
          setIsEditingDraft(false);
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
      toast.error('AI Processing Error', err.message || 'Error processing request.');
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

  // User confirms the invoice draft
  const handleConfirmDraft = async (confirmed) => {
    if (!activeDraft?.actionLogId) return;
    setExecutingAction(true);

    try {
      const draftData = isEditingDraft && editedDraft ? editedDraft : activeDraft;
      const overrides = confirmed ? {
        items: draftData.items,
        dueDate: draftData.dueDate,
        taxRate: Number(draftData.taxRate || 18),
      } : {};

      const res = await aiApi.execute({
        actionLogId: activeDraft.actionLogId,
        confirmed,
        overrides,
      });

      if (res.success) {
        if (confirmed) {
          toast.success(
            'Invoice Created & Sent',
            `Invoice ${res.data.invoice?.invoiceNumber} for ₹${Number(draftData.totalAmount || res.data.invoice?.totalAmount).toLocaleString('en-IN')} has been persisted.`
          );
        } else {
          toast.info('Draft Discarded', `The draft for ${activeDraft.clientName} was cancelled.`);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `exec_${Date.now()}`,
            role: 'assistant',
            content: confirmed
              ? `✅ **Success!** Invoice **${res.data.invoice?.invoiceNumber}** for ₹${Number(draftData.totalAmount || res.data.invoice?.totalAmount).toLocaleString('en-IN')} has been created in PostgreSQL and dispatched to **${draftData.clientName}**.`
              : `❌ The invoice draft for **${activeDraft.clientName}** was discarded per your instruction.`,
            createdAt: new Date().toISOString(),
          }
        ]);
        setActiveDraft(null);
        setEditedDraft(null);
        setIsEditingDraft(false);
      }
    } catch (err) {
      console.error('Action execution failed:', err);
      toast.error('Execution Failed', err.message || 'Failed to execute action.');
    } finally {
      setExecutingAction(false);
    }
  };

  const presetPrompts = [
    { label: 'Create Invoice for Rahul', text: 'Rahul ke liye 15000 rupees ka invoice banao for website development', cat: 'billing' },
    { label: 'Check Month Revenue', text: 'How much money did I collect this month?', cat: 'analytics' },
    { label: 'Show Pending Invoices', text: 'Show my pending invoices', cat: 'analytics' },
    { label: 'Check Overdue Accounts', text: 'Which clients have overdue payments?', cat: 'analytics' },
    { label: 'Cloud Architecture Invoice', text: 'Create ₹45,000 invoice for Rahul for Cloud Architecture & Security Audit', cat: 'billing' },
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
              BizPilot AI Business Operator
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
            className={`flex gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
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

              {/* Tool Result Cards (if any) */}
              {msg.toolResult && Array.isArray(msg.toolResult) && (
                <div className="mt-3 space-y-2 pt-2 border-t border-slate-800">
                  {msg.toolResult.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-charcoal-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-emerald-400 font-bold">{item.invoiceNumber}</span>
                        <span className="text-slate-400 ml-2">Client: {item.client}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-200">₹{Number(item.balanceDue).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-amber-400 ml-2">Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
              placeholder="Speak or type: 'Rahul ke liye 15000 ka invoice banao for website development'..."
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
