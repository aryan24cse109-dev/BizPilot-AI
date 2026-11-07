import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";

import { paymentsApi } from "../api/payments.api.js";
import { Button } from "../components/common/Button.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";

export function DummyPaymentPage() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let active = true;
    paymentsApi.getDummySession(token)
      .then((response) => {
        if (active) setSession(response?.data || response);
      })
      .catch((err) => {
        if (active) setError(err.message || "This demo payment session is unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const simulate = async (action) => {
    setProcessing(true);
    setError(null);
    try {
      const requestKey = `demo_${token.slice(0, 16)}_${action}`;
      const response = await paymentsApi.simulateDummyPayment(token, { action, requestKey });
      setResult(response?.data || response);
      setSession((response?.data || response)?.session || session);
    } catch (err) {
      setError(err.message || "The demo payment could not be processed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading demo payment..." />;

  if (error && !session) {
    return (
      <main className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white border border-rose-200 p-8 text-center space-y-3">
          <AlertCircle className="mx-auto text-rose-500" />
          <h1 className="text-xl font-bold text-slate-900">Demo payment unavailable</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </main>
    );
  }

  const completed = result?.payment?.status === "SUCCEEDED" || session?.status === "SUCCESSFUL";
  const failed = result?.payment?.status === "FAILED";

  return (
    <main className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-3xl bg-white border border-slate-200 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
            <ShieldCheck className="w-4 h-4" /> Demo Payment / Simulated Transaction
          </div>
          <h1 className="text-2xl font-black text-slate-900">{session.businessName}</h1>
          <p className="text-sm text-slate-500">No money will be transferred.</p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Invoice</span>
            <span className="font-bold text-slate-900">{session.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Amount due</span>
            <span className="font-black text-slate-900">{session.currency} {Number(session.amount).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Expires</span>
            <span>{new Date(session.expiresAt).toLocaleString("en-IN")}</span>
          </div>
        </div>

        {result && (
          <div className={`rounded-2xl p-4 text-center ${completed ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {completed ? <CheckCircle2 className="mx-auto mb-2" /> : <XCircle className="mx-auto mb-2" />}
            <p className="font-bold">{completed ? "Demo Payment Successful" : failed ? "Demo Payment Failed" : "Demo Payment Processed"}</p>
            <p className="text-xs mt-1">This is a simulated result for demonstration only.</p>
          </div>
        )}

        {error && <p className="text-sm text-rose-600 text-center">{error}</p>}

        {!completed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="primary"
              loading={processing}
              disabled={processing || session.status !== "ACTIVE"}
              onClick={() => simulate("SUCCESS")}
            >
              Simulate Successful Payment
            </Button>
            <Button
              variant="secondary"
              loading={processing}
              disabled={processing || session.status !== "ACTIVE"}
              onClick={() => simulate("FAILURE")}
            >
              Simulate Failed Payment
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export default DummyPaymentPage;
