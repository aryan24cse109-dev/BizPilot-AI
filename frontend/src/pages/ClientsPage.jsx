import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { clientsApi } from '../api/clients.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  Users,
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Building,
  ShieldCheck,
  Send,
  Plus,
  ArrowUpRight
} from 'lucide-react';

export const ClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [connections, setConnections] = useState({ accepted: [], pendingIncoming: [], pendingOutgoing: [] });
  const [loading, setLoading] = useState(true);

  // Search discovery
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('connected'); // 'connected' or 'discover'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await clientsApi.getConnections();
      if (res.success) setConnections(res.data);
    } catch (err) {
      console.error('Error fetching connections:', err);
      toast.error('Network Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await clientsApi.searchUsers(searchQuery);
      if (res.success) setSearchResults(res.data);
    } catch (err) {
      toast.error('Search Failed', err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId) => {
    setActionLoadingId(userId);
    try {
      await clientsApi.sendConnectRequest({ receiverId: userId });
      toast.success('Connection Request Sent', 'Waiting for recipient approval.');
      fetchConnections();
      handleSearch({ preventDefault: () => {} });
    } catch (err) {
      toast.error('Failed to Send Request', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRespond = async (connectionId, accept) => {
    setActionLoadingId(connectionId);
    try {
      await clientsApi.respondConnection(connectionId, accept);
      toast.success(accept ? 'Connection Accepted!' : 'Request Declined');
      fetchConnections();
    } catch (err) {
      toast.error('Action Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#1C1D22] tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1C1D22]" />
            Client Directory & Network Connections
          </h1>
          <p className="text-xs text-[#8E9297] font-medium mt-1">
            Build verified business connections to issue invoices and collaborate securely
          </p>
        </div>

        <Button
          variant={activeTab === 'discover' ? 'secondary' : 'primary'}
          size="md"
          icon={activeTab === 'discover' ? Users : UserPlus}
          onClick={() => setActiveTab(activeTab === 'discover' ? 'connected' : 'discover')}
        >
          {activeTab === 'discover' ? 'View My Network' : 'Discover & Connect'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E4DC] pb-3">
        <button
          onClick={() => setActiveTab('connected')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'connected'
              ? 'bg-[#1C1D22] text-white shadow-xs'
              : 'bg-[#FAF8F5] text-[#8E9297] hover:text-[#1C1D22] border border-[#E8E4DC]'
          }`}
        >
          Connected Clients ({connections.accepted?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'incoming'
              ? 'bg-[#1C1D22] text-white shadow-xs'
              : 'bg-[#FAF8F5] text-[#8E9297] hover:text-[#1C1D22] border border-[#E8E4DC]'
          }`}
        >
          Pending Requests
          {connections.pendingIncoming?.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'discover'
              ? 'bg-[#1C1D22] text-white shadow-xs'
              : 'bg-[#FAF8F5] text-[#8E9297] hover:text-[#1C1D22] border border-[#E8E4DC]'
          }`}
        >
          Find New Clients
        </button>
      </div>

      {/* Tab: CONNECTED CLIENTS */}
      {activeTab === 'connected' && (
        <>
          {loading ? (
            <LoadingSpinner text="Loading client connections..." />
          ) : connections.accepted?.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No connected clients yet"
              description="Connect with business clients by searching their email or username to start issuing invoices."
              actionLabel="Discover & Connect Clients"
              onAction={() => setActiveTab('discover')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.accepted.map((conn) => {
                const client = conn.user;
                return (
                  <div
                    key={conn.id}
                    className="bg-white p-5 rounded-3xl border border-[#E8E4DC] hover:border-slate-400 transition shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center font-bold text-[#1C1D22]">
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1C1D22] leading-tight">{client.name}</h3>
                          <p className="text-xs text-[#8E9297] font-medium mt-0.5">{client.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#CFDDC8] text-[#1A3018] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Connected
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-charcoal-950/70 border border-slate-800 text-xs space-y-1 text-slate-400 font-mono">
                      <div className="flex justify-between">
                        <span>Role:</span>
                        <span className="text-slate-200 font-bold uppercase">{client.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connected On:</span>
                        <span className="text-slate-300">
                          {new Date(conn.connectedAt || conn.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        icon={MessageSquare}
                        onClick={() => navigate('/messages')}
                      >
                        Message
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        icon={FileText}
                        onClick={() => navigate('/invoices?create=true')}
                      >
                        Invoice
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: PENDING INCOMING REQUESTS */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {connections.pendingIncoming?.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No pending requests"
              description="You have no inbound connection requests awaiting action."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.pendingIncoming.map((conn) => (
                <div key={conn.id} className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{conn.user.name}</h4>
                    <p className="text-xs text-slate-400">{conn.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRespond(conn.id, false)}
                      disabled={actionLoadingId === conn.id}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRespond(conn.id, true)}
                      loading={actionLoadingId === conn.id}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: DISCOVER CLIENTS */}
      {activeTab === 'discover' && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search registered clients by email or name (e.g. rahul)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-charcoal-950 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <Button type="submit" variant="primary" size="md" loading={searching} icon={Search}>
              Search
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((result) => (
                <div key={result.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-200 text-xs">
                      {result.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{result.name}</h4>
                      <p className="text-xs text-slate-400">{result.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    icon={UserPlus}
                    loading={actionLoadingId === result.id}
                    onClick={() => handleSendRequest(result.id)}
                  >
                    Send Connection Request
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
