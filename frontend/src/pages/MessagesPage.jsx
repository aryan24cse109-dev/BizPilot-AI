import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { messagesApi } from '../api/messages.api.js';
import { clientsApi } from '../api/clients.api.js';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { MessageSquare, Send, User, Check, CheckCheck, Clock } from 'lucide-react';

export const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
      alert(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex">
      {/* Sidebar: Conversation List */}
      <div className="w-80 border-r border-slate-800 bg-charcoal-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Client Collaboration Messages
          </h2>
          <p className="text-[11px] text-slate-400">Direct 1-to-1 secure chat</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {conversations.length > 0 ? (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c)}
                className={`w-full p-4 text-left transition flex items-start gap-3 ${
                  activeConv?.id === c.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : 'hover:bg-charcoal-800/40'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                  {c.otherUser?.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="text-xs font-bold text-white truncate">{c.otherUser?.name}</p>
                    <span className="text-[10px] text-slate-500">
                      {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {c.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No conversations started yet. Connect with a client to start chatting.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col bg-charcoal-950">
        {activeConv ? (
          <>
            {/* Thread Header */}
            <div className="p-4 px-6 border-b border-slate-800 bg-charcoal-900/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                {activeConv.otherUser?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{activeConv.otherUser?.name}</h3>
                <p className="text-[11px] text-slate-400">@{activeConv.otherUser?.username}</p>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-md ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/20'
                          : 'bg-charcoal-900 border border-slate-800 text-slate-200 rounded-tl-none shadow'
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Message Input Box */}
            <div className="p-4 border-t border-slate-800 bg-charcoal-900">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message to your client..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-charcoal-950 border border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Button type="submit" variant="primary" size="sm" loading={sending} icon={Send}>
                  Send
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-500">
            Select a conversation on the left to start messaging.
          </div>
        )}
      </div>
    </div>
  );
};
