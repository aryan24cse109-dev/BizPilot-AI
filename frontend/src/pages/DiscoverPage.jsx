import React, { useState } from 'react';
import { clientsApi } from '../api/clients.api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/common/Button.jsx';
import {
  Search,
  UserPlus,
  Building,
  ShieldCheck,
  CheckCircle,
  Users,
  Sparkles,
  Filter
} from 'lucide-react';

export const DiscoverPage = () => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await clientsApi.searchUsers(searchQuery);
      if (res.success) setSearchResults(res.data || []);
    } catch (err) {
      toast.error('Search Error', err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleConnect = async (userId) => {
    setActionLoadingId(userId);
    try {
      await clientsApi.sendConnectRequest({ receiverId: userId });
      toast.success('Connection Request Sent', 'Waiting for recipient approval.');
    } catch (err) {
      toast.error('Connection Request Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const displayList = searchResults;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-emerald-primary" />
          Discover & Connect
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Search registered business accounts and clients across the Wealthra™ network to establish invoicing connections.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="saas-card p-6 border border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name, email, or company handle (e.g. rahul)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-primary"
            />
          </div>
          <Button type="submit" variant="primary" size="md" loading={searching} icon={Search}>
            Search Network
          </Button>
        </form>
      </div>

      {/* Directory Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {searchResults.length > 0 ? `Search Results (${searchResults.length})` : 'Recommended Connections'}
          </h3>
          <span className="text-xs text-slate-400 font-mono">256-bit Verified Network</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((client) => (
            <div
              key={client.id}
              className="saas-card p-5 border border-slate-200 dark:border-slate-800 hover:border-emerald-primary/40 transition flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-primary border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {client.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{client.email}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-primary font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Account Type:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{client.type || 'Client'}</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                icon={UserPlus}
                loading={actionLoadingId === client.id}
                onClick={() => handleConnect(client.id)}
              >
                Connect & Enable Invoicing
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;
