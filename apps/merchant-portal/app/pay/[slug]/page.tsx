"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Lock, ShieldCheck, CheckCircle, AlertTriangle, CreditCard, ArrowLeft,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";

interface LinkInfo {
  slug: string;
  amount: string;
  currency: string;
  description: string | null;
  merchantName: string;
  createdAt: string;
}

type PageState =
  | { phase: "loading" }
  | { phase: "ready"; link: LinkInfo }
  | { phase: "paying"; link: LinkInfo }
  | { phase: "success"; payment: { id: string; status: string; amount: string; currency: string } }
  | { phase: "error"; code: string; message: string };

export default function PayPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/payment-links/public/${slug}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setState({ phase: "error", code: body.error || `HTTP ${res.status}`, message: body.message || "Payment link unavailable" });
          return;
        }
        const link = await res.json();
        setState({ phase: "ready", link });
      } catch {
        setState({ phase: "error", code: "network_error", message: "Could not reach the payment service. Please try again." });
      }
    })();
  }, [slug]);

  const validateCard = (): boolean => {
    if (!cardNumber.replace(/\s/g, "").match(/^\d{13,19}$/)) {
      setFormError("Enter a valid card number");
      return false;
    }
    const [m, y] = cardExp.split("/");
    const month = parseInt(m || "", 10);
    const year = 2000 + parseInt(y || "", 10);
    if (!month || month < 1 || month > 12 || !y || year < new Date().getFullYear()) {
      setFormError("Enter a valid expiry (MM/YY)");
      return false;
    }
    if (!cardCvc.match(/^\d{3,4}$/)) {
      setFormError("Enter a valid CVC");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validateCard()) return;
    setFormError("");
    setState((s) => (s.phase === "ready" ? { phase: "paying" } : s));
    const [m, y] = cardExp.split("/");
    try {
      const res = await fetch(`${API_BASE}/api/v1/payment-links/public/${slug}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          card: {
            number: cardNumber.replace(/\s/g, ""),
            exp_month: parseInt(m, 10),
            exp_year: parseInt(y, 10),
            cvc: cardCvc,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ phase: "error", code: body.error || `HTTP ${res.status}`, message: body.message || "Payment failed" });
        return;
      }
      setState({ phase: "success", payment: body.payment });
    } catch {
      setState({ phase: "error", code: "network_error", message: "Payment request failed. Please try again." });
    }
  };

  const errorState = state.phase === "error";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-lg text-slate-900">NexPay</span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secured by NexPay
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {state.phase === "loading" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-4">
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-9 w-48 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
            </div>
          )}

          {errorState && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${state.code === "link_already_paid" ? "bg-emerald-50" : "bg-amber-50"}`}>
                {state.code === "link_already_paid" ? (
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-amber-600" />
                )}
              </div>
              <h1 className="text-lg font-bold text-slate-900 mb-2">
                {state.code === "link_already_paid" ? "Already Paid" : "Payment Link Unavailable"}
              </h1>
              <p className="text-sm text-gray-500 mb-6">{state.message}</p>
              <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to NexPay
              </Link>
            </div>
          )}

          {(state.phase === "ready" || state.phase === "paying") && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Payment to</p>
                <h1 className="text-xl font-bold text-slate-900 mt-1">{state.link.merchantName}</h1>
                {state.link.description && (
                  <p className="text-sm text-gray-500 mt-1">{state.link.description}</p>
                )}
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-3xl font-bold text-slate-900">
                    {Number(state.link.amount).toLocaleString("en-US", { style: "currency", currency: state.link.currency })}
                  </p>
                  <span className="text-xs text-gray-400">{state.link.currency}</span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email (for receipt)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Card number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      inputMode="numeric"
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expiry</label>
                    <input
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CVC</label>
                    <input
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      inputMode="numeric"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-red-600">{formError}</p>
                )}

                <button
                  onClick={submit}
                  disabled={state.phase === "paying"}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  {state.phase === "paying" ? "Processing…" : `Pay ${Number(state.link.amount).toLocaleString("en-US", { style: "currency", currency: state.link.currency })}`}
                </button>

                <p className="text-xs text-center text-gray-400">
                  This is a demo checkout. No real card is charged.
                </p>
              </div>
            </div>
          )}

          {state.phase === "success" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 mb-1">Payment Successful</h1>
              <p className="text-sm text-gray-500 mb-6">
                {Number(state.payment.amount).toLocaleString("en-US", { style: "currency", currency: state.payment.currency })}
                {state.payment.currency} · {state.payment.status}
              </p>
              <p className="font-mono text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-6 inline-block">
                Payment ID: {state.payment.id}
              </p>
              <div>
                <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to NexPay
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white/80 py-6 text-center text-xs text-gray-400">
        <span className="flex items-center justify-center gap-1.5 mb-1">
          <ShieldCheck className="w-4 h-4" /> 256-bit SSL encryption
        </span>
        Powered by NexPay Payments
      </footer>
    </div>
  );
}
