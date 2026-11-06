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

  useEffect(() => {
    // If logged in and token is provided in URL, auto-accept immediately without asking for manual input
    const autoAcceptToken = async () => {
      if (user && token && !accepted && !accepting) {
        setAccepting(true);
        try {
          await clientsApi.acceptInvitation(token);
          setAccepted(true);
          toast.success('Connected', 'Your client account is now linked to the business.');
          setTimeout(() => {
            navigate('/portal/invoices');
          }, 1500);
        } catch (err) {
          // If already accepted or error, still allow client to proceed to invoices
          setAccepted(true);
        } finally {
          setAccepting(false);
        }
      }
    };

    if (!authLoading) {
      autoAcceptToken();
    }
  }, [user, token, authLoading]);

  if (authLoading || accepting) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4">
        <LoadingSpinner size="lg" text="Connecting your account to invoices..." />
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
            Client Invoicing & Portal
          </h1>
          <p className="text-xs text-[#8E9297] font-medium">
            Your client account connects directly to issuing businesses on Wealthra™ for verified invoices, receipts, and payments.
          </p>
        </div>

        {accepted || (user && !token) ? (
          <div className="p-6 rounded-2xl bg-[#CFDDC8]/30 border border-[#B8CEB0] text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-bold text-[#1C1D22]">Connected to Your Invoices</h2>
            <p className="text-xs text-[#8E9297]">
              All tax invoices and billing records issued to your email are accessible in your portal.
            </p>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={() => navigate('/portal/invoices')}
              className="mx-auto mt-2"
            >
              View My Invoices
            </Button>
          </div>
        ) : !user ? (
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-4 text-center">
            <Mail className="w-8 h-8 text-[#8E9297] mx-auto" />
            <div>
              <p className="text-xs font-bold text-[#1C1D22]">Sign In with Your Email</p>
              <p className="text-[11px] text-[#8E9297] mt-1">
                Sign in with the email address where you received the invoice to automatically view and settle your invoices.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigate(
                    `/login?redirect=${encodeURIComponent(
                      window.location.pathname + window.location.search
                    )}`
                  )
                }
              >
                Sign In to View Invoices
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/register')}
              >
                Create Account
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] text-center space-y-2">
              <p className="text-[11px] text-[#8E9297]">Signed in as:</p>
              <p className="text-xs font-bold text-[#1C1D22]">
                {user.name || user.fullName} ({user.email})
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon={ArrowRight}
              onClick={() => navigate('/portal/invoices')}
            >
              Proceed to Invoices & Portal
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-[#E8E4DC] text-center">
          <Link
            to={user?.accountCategory === 'CLIENT' ? '/portal/invoices' : '/business'}
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

