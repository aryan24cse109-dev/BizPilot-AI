import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { clientsApi } from '../api/clients.api.js';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Building, Mail } from 'lucide-react';

export const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [manualToken, setManualToken] = useState(token || '');

  const handleAccept = async (tokenToUse) => {
    const t = tokenToUse || manualToken;
    if (!t) {
      toast.error('Token Required', 'Please provide a valid invitation token.');
      return;
    }

    setAccepting(true);
    setError(null);
    try {
      await clientsApi.acceptInvitation(t);
      setAccepted(true);
      toast.success('Invitation Accepted', 'You are now connected with the business.');
      setTimeout(() => {
        navigate('/portal');
      }, 2000);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to accept invitation.';
      setError(msg);
      toast.error('Acceptance Failed', msg);
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4">
        <LoadingSpinner size="lg" text="Verifying session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1C1D22] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8E4DC] shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#CFDDC8]/40 border border-[#B8CEB0] flex items-center justify-center text-[#1C1D22]">
            <Building className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-[#1C1D22] tracking-tight">
            Business Collaboration Invitation
          </h1>
          <p className="text-xs text-[#8E9297] font-medium">
            A verified business has invited your account to collaborate and receive digital tax invoices on Wealthra™.
          </p>
        </div>

        {accepted ? (
          <div className="p-6 rounded-2xl bg-[#CFDDC8]/30 border border-[#B8CEB0] text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-bold text-[#1C1D22]">Invitation Accepted Successfully!</h2>
            <p className="text-xs text-[#8E9297]">
              Redirecting you to your Client Portal...
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/portal')}
              className="mx-auto"
            >
              Go to Portal
            </Button>
          </div>
        ) : !user ? (
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-4 text-center">
            <Mail className="w-8 h-8 text-[#8E9297] mx-auto" />
            <div>
              <p className="text-xs font-bold text-[#1C1D22]">Sign In Required</p>
              <p className="text-[11px] text-[#8E9297] mt-1">
                Please sign in with the client email address that received the invitation to accept it.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
              >
                Sign In to Accept
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/register')}
              >
                Register Client
              </Button>
            </div>
          </div>
        ) : user.accountCategory === 'BUSINESS' ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
            <p className="text-xs font-bold text-amber-900">Signed In As Business</p>
            <p className="text-[11px] text-amber-800">
              You are signed in as a Business account. Only client accounts can accept vendor invitations. Please sign in with your client account.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC]">
              <p className="text-[11px] text-[#8E9297]">Signed in as:</p>
              <p className="text-xs font-bold text-[#1C1D22]">{user.name} ({user.email})</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1D22] mb-1.5">
                Invitation Token / Security Hash
              </label>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Enter 64-character invite token"
                className="w-full bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1D22] font-mono focus:outline-none focus:border-slate-400"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={accepting}
              icon={CheckCircle2}
              onClick={() => handleAccept()}
            >
              Accept Collaboration Invitation
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-[#E8E4DC] text-center">
          <Link
            to={user?.accountCategory === 'CLIENT' ? '/portal' : '/business'}
            className="text-xs text-[#8E9297] hover:text-[#1C1D22] font-semibold"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;

