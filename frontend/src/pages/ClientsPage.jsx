import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { clientsApi } from '../api/clients.api.js';
import { invoicesApi } from '../api/invoices.api.js';
import { messagesApi } from '../api/messages.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  Users,
  Search,
  Plus,
  FileText,
  MessageSquare,
  Building,
  Mail,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

export const ClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Client Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  const fetchClientDirectory = async () => {
    setLoading(true);
    try {
      const [connRes, invRes] = await Promise.all([
        clientsApi.getConnections().catch(() => ({ data: { connections: [] } })),
        invoicesApi.listWorkspaceInvoices({ limit: 100 }).catch(() => ({ data: { invoices: [] } })),
      ]);

      const conns = connRes?.data?.connections || connRes?.connections || [];
      const invoices = invRes?.data?.invoices || invRes?.invoices || [];

      // Aggregate client directory map by lowercase email
      const clientMap = new Map();

      // 1. Add connected clients
      conns.forEach((c) => {
        if (c.clientUser && c.clientUser.email) {
          const email = c.clientUser.email.toLowerCase();
          clientMap.set(email, {
            id: c.clientUser.id,
            name: c.clientUser.fullName || c.clientUser.username || 'Client User',
            email,
            company: c.clientUser.clientProfile?.billingAddress || '',
            isRegistered: true,
            invoicesCount: 0,
            totalBilled: 0,
            outstandingBalance: 0,
            status: 'ACTIVE',
          });
        }
      });

      // 2. Add or update with invoiced client metrics
      invoices.forEach((inv) => {
        if (!inv.clientEmail) return;
        const email = inv.clientEmail.toLowerCase();
        const existing = clientMap.get(email) || {
          id: inv.clientUserId || null,
          name: inv.clientName || 'Invoiced Client',
          email,
          company: '',
          isRegistered: Boolean(inv.clientUserId),
          invoicesCount: 0,
          totalBilled: 0,
          outstandingBalance: 0,
          status: inv.clientUserId ? 'ACTIVE' : 'INVITED',
        };

        existing.invoicesCount += 1;
        existing.totalBilled += Number(inv.totalAmount || 0);
        existing.outstandingBalance += Number(inv.balanceDue || 0);
        if (inv.clientUserId) existing.isRegistered = true;

        clientMap.set(email, existing);
      });

      setClients(Array.from(clientMap.values()));
    } catch (err) {
      console.error('Error fetching client directory:', err);
      toast.error('Directory Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDirectory();
  }, []);

  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    if (!newClientEmail.trim() || !newClientName.trim()) {
      toast.error('Validation Error', 'Client name and email address are required.');
      return;
    }

    setSavingClient(true);
    try {
      // Auto-dispatch invitation / registration email to the client
      await clientsApi.sendInvitation(newClientEmail.trim());
      toast.success(
        'Client Added & Invited',
        `Invitation sent to ${newClientEmail}. You can now issue invoices immediately.`
      );
      setShowAddModal(false);
      const name = newClientName;
      const email = newClientEmail;
      setNewClientName('');
      setNewClientEmail('');
      setNewClientCompany('');
      await fetchClientDirectory();

      // Offer to create first invoice
      navigate(`/business/invoices?create=true&clientName=${encodeURIComponent(name)}&clientEmail=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error('Failed to Add Client', err.message);
    } finally {
      setSavingClient(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const totalClients = clients.length;
  const totalBilledAcrossClients = clients.reduce((sum, c) => sum + c.totalBilled, 0);
  const totalOutstanding = clients.reduce((sum, c) => sum + c.outstandingBalance, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#1C1D22] tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1C1D22]" />
            Client Directory
          </h1>
          <p className="text-xs text-[#8E9297] font-medium mt-1">
            Authoritative registry of clients invoiced by your business with real-time billing metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Add New Client
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8E4DC] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#CFDDC8] border border-[#B8CEB0] flex items-center justify-center font-bold text-lg text-[#1C1D22]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8E9297] uppercase">Total Clients</span>
            <p className="font-mono text-2xl font-black text-[#1C1D22] mt-0.5">{totalClients}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8E4DC] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C2DBE7] border border-[#A5C8D8] flex items-center justify-center font-bold text-lg text-[#1C1D22]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8E9297] uppercase">Total Volume Billed</span>
            <p className="font-mono text-2xl font-black text-[#1C1D22] mt-0.5">₹{totalBilledAcrossClients.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8E4DC] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F2D5CB] border border-[#E0B8AC] flex items-center justify-center font-bold text-lg text-[#1C1D22]">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8E9297] uppercase">Outstanding Receivables</span>
            <p className="font-mono text-2xl font-black text-rose-600 mt-0.5">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8E4DC] shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search clients by name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl pl-10 pr-4 py-2 text-xs text-[#1C1D22] focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Clients Table */}
      {loading ? (
        <LoadingSpinner text="Loading client directory..." />
      ) : filteredClients.length > 0 ? (
        <div className="bg-white rounded-3xl overflow-hidden border border-[#E8E4DC] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#8E9297] border-b border-[#E8E4DC]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Client Name</th>
                  <th className="py-3.5 px-4 font-bold">Email Address</th>
                  <th className="py-3.5 px-4 font-bold text-center">Invoices</th>
                  <th className="py-3.5 px-4 font-bold">Total Invoiced</th>
                  <th className="py-3.5 px-4 font-bold">Balance Due</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                {filteredClients.map((c) => (
                  <tr key={c.email} className="hover:bg-[#FAF8F5] transition">
                    <td className="py-3.5 px-4 font-bold text-[#1C1D22] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#CFDDC8] border border-[#B8CEB0] flex items-center justify-center font-bold text-xs text-[#1C1D22]">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#1C1D22]">{c.name}</p>
                        {c.company && <p className="text-[10px] text-[#8E9297]">{c.company}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#8E9297] font-mono">
                      {c.email}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-[#1C1D22]">
                      {c.invoicesCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1D22]">
                      ₹{c.totalBilled.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {c.outstandingBalance > 0 ? (
                        <span className="text-amber-600">₹{c.outstandingBalance.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-emerald-600">₹0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          c.isRegistered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {c.isRegistered ? 'REGISTERED' : 'AUTO-INVITED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            navigate(`/business/invoices?create=true&clientName=${encodeURIComponent(c.name)}&clientEmail=${encodeURIComponent(c.email)}`)
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-[#1C1D22] hover:bg-[#2C2D35] text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1.5"
                          title="Issue digital invoice to client"
                        >
                          <FileText className="w-3.5 h-3.5" /> Invoice Client
                        </button>

                        <button
                          onClick={() => navigate('/business/messages')}
                          className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-white text-slate-700 border border-[#E8E4DC] transition"
                          title="Message Client"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No clients found in directory"
          description="Clients will appear here automatically as soon as you create invoices for them, or you can add a client contact directly."
          actionLabel="Add Your First Client"
          onAction={() => setShowAddModal(true)}
        />
      )}

      {/* ADD CLIENT MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Client to Directory"
        size="md"
      >
        <form onSubmit={handleAddClientSubmit} className="space-y-4">
          <Input
            label="Client Full Name *"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            required
          />

          <Input
            label="Client Email Address *"
            type="email"
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
            placeholder="e.g. rahul@rahulenterprises.com"
            required
          />

          <Input
            label="Company / Legal Entity (Optional)"
            value={newClientCompany}
            onChange={(e) => setNewClientCompany(e.target.value)}
            placeholder="e.g. Rahul Enterprises Pvt Ltd"
          />

          <p className="text-[11px] text-[#8E9297]">
            When you create an invoice, an onboarding invitation will be automatically dispatched to this email address. Once the client registers or logs in with this email, their account will automatically link with your invoices.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E4DC]">
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={savingClient}>
              Save & Proceed to Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
