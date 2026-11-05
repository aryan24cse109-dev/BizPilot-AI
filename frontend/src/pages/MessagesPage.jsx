import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { messagesApi } from '../api/messages.api.js';
import { clientsApi } from '../api/clients.api.js';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  MessageSquare,
  Send,
  User,
  Building,
  Check,
  CheckCheck,
  Search,
  Plus,
  ArrowRight
} from 'lucide-react';

export const MessagesPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  // Start new conversation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const messagesEndRef = useRef(null);

  const isClientView = location.pathname.startsWith('/portal');

  const fetchConversations = async () => {
    try {
      const res = await messagesApi.listConversations();
      const list = res?.data?.data || res?.data || [];
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const res = await messagesApi.getMessages(convId);
      const list = res?.data?.data || res?.data || [];
      setMessages(list);
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Messages Error', err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await messagesApi.sendMessage(activeConvId, content);
      const newMsg = res?.data?.data || res?.data;
      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
        fetchConversations();
      }
    } catch (err) {
      toast.error('Send Failed', err.message);
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const handleOpenNewModal = async () => {
    setShowNewModal(true);
    setLoadingContacts(true);
    try {
      const res = await clientsApi.getConnections();
      const list = res?.data?.connections || res?.connections || [];
      const partners = list
        .map((c) => (c.businessUserId === user?.id ? c.clientUser : c.businessUser))
        .filter(Boolean);
      setContacts(partners);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleStartConversationWith = async (recipientId) => {
    try {
      const res = await messagesApi.getOrCreateConversation(recipientId);
      const conv = res?.data?.data || res?.data;
      if (conv?.id) {
        setShowNewModal(false);
        await fetchConversations();
        setActiveConvId(conv.id);
      }
    } catch (err) {
      toast.error('Could not start conversation', err.message);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.fullName || c.otherUser?.businessProfile?.businessName || '';
    const email = c.otherUser?.email || '';
    return name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#1C1D22] tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#1C1D22]" />
            {isClientView ? 'Vendor Communications' : 'Client Inquiries & Messages'}
          </h1>
          <p className="text-xs text-[#8E9297] font-medium mt-1">
            Authoritative, direct communication between business operators and invoiced clients
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenNewModal}
        >
          New Conversation
        </Button>
      </div>

      {/* Main Chat Interface */}
      {loading ? (
        <LoadingSpinner text="Loading communications..." />
      ) : (
        <div className="bg-white rounded-3xl border border-[#E8E4DC] shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[650px]">
          {/* Left Column: Conversations Thread List */}
          <div className="border-r border-[#E8E4DC] flex flex-col h-full bg-[#FAF8F5]">
            <div className="p-3.5 border-b border-[#E8E4DC]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-[#E8E4DC] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1C1D22] focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-[#F0ECE4]">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((c) => {
                  const isSelected = c.id === activeConvId;
                  const partnerName =
                    c.otherUser?.businessProfile?.businessName ||
                    c.otherUser?.fullName ||
                    c.otherUser?.email ||
                    'Contact';
                  const initials = partnerName.substring(0, 2).toUpperCase();

                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConvId(c.id)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                        isSelected ? 'bg-white border-l-4 border-[#1C1D22]' : 'hover:bg-white/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-[#CFDDC8] border border-[#B8CEB0] flex items-center justify-center font-bold text-xs text-[#1C1D22] shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#1C1D22] truncate">{partnerName}</p>
                          {c.lastMessage && (
                            <span className="text-[10px] text-[#8E9297]">
                              {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8E9297] truncate mt-0.5">
                          {c.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-[#8E9297]">
                  No active conversations found.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Chat Box */}
          <div className="md:col-span-2 flex flex-col h-full bg-white">
            {activeConversation ? (
              <>
                {/* Chat Top Banner */}
                <div className="p-4 border-b border-[#E8E4DC] flex items-center justify-between bg-[#FAF8F5]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#CFDDC8] border border-[#B8CEB0] flex items-center justify-center font-bold text-xs text-[#1C1D22]">
                      {(activeConversation.otherUser?.fullName || activeConversation.otherUser?.email || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1C1D22]">
                        {activeConversation.otherUser?.businessProfile?.businessName || activeConversation.otherUser?.fullName || 'Contact'}
                      </p>
                      <p className="text-[10px] text-[#8E9297] font-mono">
                        {activeConversation.otherUser?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message Bubble Thread */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]/30">
                  {loadingMessages ? (
                    <LoadingSpinner text="Fetching messages..." />
                  ) : messages.length > 0 ? (
                    messages.map((m) => {
                      const isMe = m.senderId === user?.id || m.isSender;

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-md p-3.5 rounded-2xl text-xs ${
                              isMe
                                ? 'bg-[#1C1D22] text-white rounded-br-none shadow-xs'
                                : 'bg-white border border-[#E8E4DC] text-[#1C1D22] rounded-bl-none shadow-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                          <span className="text-[9px] text-[#8E9297] mt-1 px-1">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center text-xs text-[#8E9297]">
                      This is the beginning of your conversation. Send a message below.
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-[#E8E4DC] bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl px-4 py-2.5 text-xs text-[#1C1D22] focus:outline-none focus:border-slate-400"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    loading={sending}
                    icon={Send}
                  >
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="w-12 h-12 text-[#8E9297] mb-2" />
                <h3 className="text-sm font-bold text-[#1C1D22]">No Active Conversation Selected</h3>
                <p className="text-xs text-[#8E9297] mt-1">
                  Choose a contact from the left list or click "New Conversation" to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW CONVERSATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E8E4DC] shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]">
              <h3 className="text-sm font-bold text-[#1C1D22]">Start New Conversation</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#8E9297] hover:text-[#1C1D22] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8E9297]">
              Select a business partner or client connected to your account:
            </p>

            {loadingContacts ? (
              <LoadingSpinner text="Loading contacts..." />
            ) : contacts.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleStartConversationWith(contact.id)}
                    className="p-3 rounded-xl bg-[#FAF8F5] hover:bg-[#CFDDC8]/30 border border-[#E8E4DC] flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1C1D22]">
                        {contact.businessProfile?.businessName || contact.fullName || contact.username}
                      </p>
                      <p className="text-[10px] text-[#8E9297] font-mono">{contact.email}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#8E9297]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#8E9297]">
                No connected contacts found. Once you issue or receive an invoice, contacts appear here automatically.
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#E8E4DC]">
              <Button variant="secondary" size="sm" onClick={() => setShowNewModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
