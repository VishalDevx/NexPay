"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/auth/password-reset-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "invalid_or_expired_token" ? "Link expired or invalid" : data.error);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Invalid reset link</h2>
        <p className="text-gray-400 text-sm mb-6">This link is missing required parameters.</p>
        <Link href="/forgot-password">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white">Request new link</Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Password reset complete</h2>
        <p className="text-gray-400 text-sm mb-6">
          Your password has been updated. All active sessions have been logged out.
        </p>
        <Link href="/login">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white">Sign in with new password</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <h1 className="text-2xl font-bold text-white">Set new password</h1>
        <p className="text-gray-400 text-sm mt-1">For {email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min. 8 characters"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Repeat password"
            minLength={8}
            required
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" size="lg" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <div className="bg-slate-800/80 border border-slate-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
