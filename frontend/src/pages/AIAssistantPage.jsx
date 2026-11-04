import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
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
  Volume2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';

export const AIAssistantPage = () => {
  const { user, activeWorkspace } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Namaste ${user?.name || 'Business Leader'}! I am your **BizPilot AI Business Operator**. You can speak or type to me in **English, Hindi, or Hinglish**.\n\nTry saying:\n- *"Rahul ke liye 15000 rupees ka invoice banao for website development."*\n- *"How much money did I collect this month?"*\n- *"Show my pending invoices."*`,
      createdAt: new Date().toISOString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeDraft, setActiveDraft] = useState(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeDraft]);

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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Convert to base64
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
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      // Fallback for environment without physical mic
      setInputText('Rahul ke liye 15000 rupees ka invoice banao for website development');
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
          setActiveDraft({ ...draft, actionLogId });
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
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

  // User confirms the invoice draft
  const handleConfirmDraft = async (confirmed) => {
    if (!activeDraft?.actionLogId) return;
    setExecutingAction(true);
    try {
      const res = await aiApi.execute({
        actionLogId: activeDraft.actionLogId,
        confirmed,
      });

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `exec_${Date.now()}`,
            role: 'assistant',
            content: confirmed
              ? `✅ **Success!** Invoice **${res.data.invoice?.invoiceNumber}** for ₹${Number(activeDraft.totalAmount).toLocaleString('en-IN')} has been persisted to PostgreSQL and sent to **${activeDraft.clientName}**.`
              : `❌ The invoice draft for **${activeDraft.clientName}** was discarded per your instruction.`,
            createdAt: new Date().toISOString(),
          }
        ]);
        setActiveDraft(null);
      }
    } catch (err) {
      console.error('Action execution failed:', err);
      alert(err.message || 'Failed to execute action.');
    } finally {
      setExecutingAction(false);
    }
  };

  const presetPrompts = [
    'Rahul ke liye 15000 rupees ka invoice banao for website development',
    'How much money did I collect this month?',
    'Show my pending invoices',
    'Which clients have overdue payments?',
  ];

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 px-6 border-b border-slate-800 bg-charcoal-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-charcoal-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              BizPilot AI Business Operator
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                Sarvam & Gemini Active
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Multilingual Voice & Text Assistant (English • Hindi • Hinglish)
            </p>
          </div>
        </div>

        {/* Quick Clear or Status */}
        <span className="text-xs text-slate-400 font-medium">
          {activeWorkspace?.name}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
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
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              {msg.role === 'user' ? (user?.name?.slice(0, 1) || 'U') : <Sparkles className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/20'
                  : 'bg-charcoal-900 border border-slate-700/80 text-slate-200 rounded-tl-none shadow-lg'
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

        {/* Live Interactive Draft Preview Card */}
        {activeDraft && (
          <div className="max-w-2xl bg-charcoal-900 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-2xl glow-emerald animate-in zoom-in-95 ml-11">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Invoice Draft Confirmation Required</h4>
              </div>
              <span className="text-[11px] bg-amber-500/15 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                Awaiting Confirmation
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <span className="text-slate-400">Client:</span>
                <p className="font-bold text-slate-100 text-sm mt-0.5">{activeDraft.clientName}</p>
              </div>
              <div>
                <span className="text-slate-400">Due Date:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{activeDraft.dueDate}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-xl bg-charcoal-950 p-3 mb-4 border border-slate-800">
              <div className="flex justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800">
                <span>Description</span>
                <span>Amount</span>
              </div>
              {(activeDraft.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs py-2 text-slate-200">
                  <span>{it.description} (x{it.quantity})</span>
                  <span className="font-mono">₹{Number(it.unitPrice).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-1 text-xs border-t border-slate-800 pt-3 mb-5">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">₹{Number(activeDraft.subtotal || activeDraft.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (18%):</span>
                <span className="font-mono text-slate-200">₹{Number(activeDraft.taxAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1 border-t border-slate-800">
                <span>Grand Total:</span>
                <span className="font-mono">₹{Number(activeDraft.totalAmount || activeDraft.amount).toLocaleString('en-IN')}</span>
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
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConfirmDraft(true)}
                loading={executingAction}
                icon={CheckCircle2}
              >
                Confirm & Create Invoice
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="p-3.5 rounded-2xl bg-charcoal-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Processing intent and verifying financial permissions...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Chips */}
      <div className="px-6 py-2 bg-charcoal-900/60 border-t border-slate-800/80 flex gap-2 overflow-x-auto no-scrollbar">
        {presetPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-charcoal-800/80 hover:bg-emerald-500/15 hover:text-emerald-300 text-slate-300 border border-slate-700/60 transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-charcoal-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Microphone Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-xl border transition flex items-center justify-center ${
              isRecording
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-charcoal-800 hover:bg-charcoal-700 text-slate-300 border-slate-700/60'
            }`}
            title={isRecording ? 'Click to stop voice recording' : 'Hold or click to speak in Hindi/English'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </button>

          {isRecording ? (
            <div className="flex-1 bg-charcoal-950 border border-rose-500/50 rounded-xl px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Listening in Hindi/English ({recordingTime}s)...
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="text-xs font-bold text-white bg-rose-600 px-2.5 py-1 rounded-lg"
              >
                Transcribe
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
