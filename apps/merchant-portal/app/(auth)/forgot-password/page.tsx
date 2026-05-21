"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/auth/password-reset-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Something went wrong");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <div className="bg-slate-800/80 border border-slate-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm mb-6">
              If an account exists for <span className="text-white font-medium">{email}</span>,
              we&apos;ve sent a password reset link. It expires in 15 minutes.
            </p>
            <p className="text-gray-500 text-xs">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button onClick={() => setSent(false)} className="text-blue-400 hover:underline">
                try again
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">Reset your password</h1>
              <p className="text-gray-400 text-sm mt-1">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@company.com"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
