import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { messagesApi } from '../api/messages.api.js';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { MessageSquare, Send, User, Check, CheckCheck, Clock, Search, FileText } from 'lucide-react';

export const MessagesPage = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [convSearch, setConvSearch] = useState('');

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
      toast.error('Messages Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setActiveConv(conv);
    try {
      const res = await messagesApi.getMessages(conv.id);
      if (res.success) {
        setMessages(res.data);
      }
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
      toast.error('Send Failed', err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.otherUser?.name?.toLowerCase().includes(convSearch.toLowerCase()) ||
    c.otherUser?.email?.toLowerCase().includes(convSearch.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-7.5rem)] glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col md:flex-row">
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-80 border-r border-slate-800 bg-charcoal-900/95 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Client Collaboration
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Encrypted
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c)}
                className={`w-full p-4 text-left transition flex items-start gap-3 ${
                  activeConv?.id === c.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : 'hover:bg-charcoal-800/40'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                  {c.otherUser?.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-100 truncate">{c.otherUser?.name}</p>
                    <span className="text-[10px] text-slate-500">
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {c.lastMessage?.content || 'Started conversation'}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-charcoal-950/70">
        {activeConv ? (
          <>
            {/* Active Conversation Header */}
            <div className="p-4 px-6 border-b border-slate-800 bg-charcoal-900/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                  {activeConv.otherUser?.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white leading-tight">{activeConv.otherUser?.name}</h3>
                  <p className="text-[11px] text-slate-400">{activeConv.otherUser?.email}</p>
                </div>
              </div>
            </div>

            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-600/20'
                          : 'bg-charcoal-900 border border-slate-700/80 text-slate-200 rounded-bl-none'
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

            {/* Input Form */}
            <div className="p-4 bg-charcoal-900 border-t border-slate-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message or discuss an invoice..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-charcoal-950 border border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
              title="Select a conversation"
              description="Choose a client from the left pane to collaborate directly on invoices and payments."
            />
          </div>
        )}
      </div>
    </div>
  );
};
