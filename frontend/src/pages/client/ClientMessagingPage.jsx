import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { messagesApi } from '../../api/messages.api.js';
import { Button } from '../../components/common/Button.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  MessageSquare,
  Send,
  Building,
  FileText,
  Search,
  Check,
  CheckCheck,
  CreditCard,
  ExternalLink
} from 'lucide-react';

export const ClientMessagingPage = () => {
  const [searchParams] = useSearchParams();
  const invoiceParam = searchParams.get('invoiceNumber');
  const { user } = useAuth();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState(
    invoiceParam ? `Regarding invoice ${invoiceParam}: ` : ''
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const scrollRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const res = await messagesApi.listConversations();
      if (res.success) {
        setConversations(res.data);
        if (res.data.length > 0 && !activeConv) {
          selectConversation(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setActiveConv(conv);
    try {
      const res = await messagesApi.getMessages(conv.id);
      if (res.success) setMessages(res.data);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConv) return;
    const text = messageText;
    setMessageText('');
    setSending(true);

    try {
      const res = await messagesApi.sendMessage(activeConv.id, { content: text });
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        fetchConversations();
      }
    } catch (err) {
      toast.error('Send Error', err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] saas-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col md:flex-row">
      {/* Left Sidebar: Connected Vendors */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-charcoal-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-primary" />
            Connected Vendors
          </h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
          {conversations.length > 0 ? (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c)}
                className={`w-full p-4 text-left transition flex items-start gap-3 ${
                  activeConv?.id === c.id
                    ? 'bg-emerald-500/10 border-l-2 border-l-emerald-primary'
                    : 'hover:bg-slate-50 dark:hover:bg-charcoal-800/40'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-charcoal-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  {c.otherUser?.name?.slice(0, 2).toUpperCase() || '--'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {c.otherUser?.name || 'Authorized Contact'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {c.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              No conversations yet.
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-charcoal-950/40">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-charcoal-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-primary/20 text-emerald-primary flex items-center justify-center font-bold text-xs">
                  {activeConv.otherUser?.name?.slice(0, 2).toUpperCase() || '--'}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {activeConv.otherUser?.name || 'Authorized Contact'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Vendor Direct Communication Channel
                  </p>
                </div>
              </div>
            </div>

            {/* Contextual Invoice Card if referenced */}
            {invoiceParam && (
              <div className="m-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-primary" />
                  <span className="text-slate-700 dark:text-slate-200">
                    Conversation linked to invoice <strong className="font-mono text-emerald-primary">{invoiceParam}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-emerald-primary text-white rounded-br-none shadow-sm'
                          : 'bg-surface-light dark:bg-charcoal-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-bl-none shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <span className="block text-[9px] opacity-70 text-right mt-1 font-mono">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Composer */}
            <div className="p-4 bg-surface-light dark:bg-charcoal-900 border-t border-slate-200 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about an invoice or payment..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-slate-100 dark:bg-charcoal-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-primary"
                />
                <Button type="submit" variant="primary" size="md" disabled={!messageText.trim() || sending} icon={Send}>
                  Send
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              icon={MessageSquare}
              title="Select a vendor conversation"
              description="Communicate directly with your service providers regarding invoices and deliverables."
            />
          </div>
        )}
      </div>
    </div>
  );
};
