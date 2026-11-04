import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

export const ClientsPage = () => {
  const navigate = useNavigate();
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
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId) => {
    setActionLoadingId(userId);
    try {
      await clientsApi.sendConnectRequest({ receiverId: userId });
      alert('Connection request sent!');
      fetchConnections();
      handleSearch({ preventDefault: () => {} });
    } catch (err) {
      alert(err.message || 'Failed to send connection request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRespond = async (connectionId, accept) => {
    setActionLoadingId(connectionId);
    try {
      await clientsApi.respondConnection(connectionId, accept);
      fetchConnections();
    } catch (err) {
      alert(err.message || 'Failed to respond to request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Client Directory & Network Connections
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build verified connections to issue invoices and collaborate securely
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-charcoal-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('connected')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'connected' ? 'bg-emerald-500 text-charcoal-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Connected ({connections.accepted.length})
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'discover' ? 'bg-emerald-500 text-charcoal-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Discover & Search
          </button>
        </div>
      </div>

      {/* Pending Incoming Requests Banner */}
      {connections.pendingIncoming.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-emerald-500 space-y-3">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Incoming Connection Requests ({connections.pendingIncoming.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {connections.pendingIncoming.map((req) => (
              <div key={req.connectionId} className="p-3 rounded-xl bg-charcoal-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-200">{req.user?.name}</p>
                  <p className="text-[11px] text-slate-400">@{req.user?.username}</p>
                  {req.notes && <p className="text-[10px] text-emerald-400/80 italic mt-0.5">"{req.notes}"</p>}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={actionLoadingId === req.connectionId}
                    onClick={() => handleRespond(req.connectionId, true)}
                    icon={CheckCircle}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={actionLoadingId === req.connectionId}
                    onClick={() => handleRespond(req.connectionId, false)}
                    className="text-rose-400"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Connected Network */}
      {activeTab === 'connected' && (
        <>
          {loading ? (
            <LoadingSpinner text="Loading client connections..." />
          ) : connections.accepted.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.accepted.map((conn) => (
                <div key={conn.connectionId} className="glass-panel p-5 rounded-2xl glass-panel-hover flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {conn.user?.name?.slice(0, 2).toUpperCase() || 'CL'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{conn.user?.name}</h4>
                        <p className="text-[11px] text-slate-400">@{conn.user?.username}</p>
                      </div>
                    </div>
                    <Badge status="ACCEPTED" label="Connected" />
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      {conn.user?.workspacesOwned?.[0]?.name || 'Independent Business'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Connected since {new Date(conn.connectedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={MessageSquare}
                      onClick={() => navigate('/messages')}
                    >
                      Message
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={FileText}
                      onClick={() => navigate('/invoices?create=true')}
                    >
                      Issue Invoice
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No connected clients yet"
              description="Switch to the Discover & Search tab to find clients and send connection requests."
              actionLabel="Discover Clients"
              onAction={() => setActiveTab('discover')}
            />
          )}
        </>
      )}

      {/* Tab: Discover & Search */}
      {activeTab === 'discover' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              icon={Search}
              placeholder="Search by username or business name (e.g. rahul, tech, agency)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="primary" loading={searching}>
              Search Network
            </Button>
          </form>

          {searching ? (
            <LoadingSpinner text="Searching verified user accounts..." />
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {searchResults.map((usr) => (
                <div key={usr.id} className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm">
                      {usr.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{usr.name}</h4>
                      <p className="text-[11px] text-slate-400">@{usr.username}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Workspace: {usr.workspacesOwned?.[0]?.name || 'Business Account'}
                  </p>

                  <div className="pt-2 border-t border-slate-800">
                    {usr.connection?.status === 'ACCEPTED' ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Already Connected
                      </span>
                    ) : usr.connection?.status === 'PENDING' ? (
                      <span className="text-xs text-amber-400 font-semibold">
                        Request Pending
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        loading={actionLoadingId === usr.id}
                        onClick={() => handleSendRequest(usr.id)}
                        icon={UserPlus}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No registered users matched your query.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
