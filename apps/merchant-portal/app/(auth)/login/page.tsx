"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"totp" | "sms" | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "invalid_credentials" ? "Invalid email or password" : data.error);

      if (data.mfaRequired) {
        setMfaMethod(data.totpEnabled ? "totp" : "sms");
        setMfaRequired(true);
        return;
      }

      localStorage.setItem("nexpay_token", data.token);
      localStorage.setItem("nexpay_merchant", JSON.stringify(data.merchant));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="bg-slate-800/80 border border-slate-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <h2 className="text-xl font-bold text-white">Two-factor authentication</h2>
            <p className="text-gray-400 text-sm mt-1">Enter the code from your authenticator app</p>
          </div>
          <MfaVerifyForm email={email} method={mfaMethod!} onSuccess={(token, merchant) => {
            localStorage.setItem("nexpay_token", token);
            localStorage.setItem("nexpay_merchant", JSON.stringify(merchant));
            router.push("/dashboard");
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <div className="bg-slate-800/80 border border-slate-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your merchant account</p>
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
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

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-blue-400 hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" size="lg" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-400 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

function MfaVerifyForm({
  email,
  method,
  onSuccess,
}: {
  email: string;
  method: "totp" | "sms";
  onSuccess: (token: string, merchant: any) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = useBackup
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/auth/verify-backup-code`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/auth/verify-totp`;

      const body = useBackup ? { email, code } : { email, token: code };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "invalid_totp" ? "Invalid code" : data.error);

      onSuccess(data.token, data.merchant);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {useBackup ? "Backup code" : method === "totp" ? "Authenticator code" : "SMS code"}
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-center text-lg tracking-widest text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="000000"
          maxLength={useBackup ? 32 : 6}
          required
        />
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" size="lg" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
      </Button>
      <button
        type="button"
        onClick={() => { setUseBackup(!useBackup); setError(""); }}
        className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition"
      >
        {useBackup ? "Use authenticator code instead" : "Use a backup code"}
      </button>
    </form>
  );
}
