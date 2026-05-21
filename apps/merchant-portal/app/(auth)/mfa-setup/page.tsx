"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Check, Copy, Smartphone, Shield, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MfaSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "totp" | "backup" | "sms">("choose");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState("");
  const [smsSent, setSmsSent] = useState(false);

  const getToken = () => localStorage.getItem("nexpay_token");

  const setupTotp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/mfa/totp/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSecret(data.secret);
      setUri(data.uri);
      setBackupCodes(data.backupCodes);
      setStep("totp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const enableTotp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/mfa/totp/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ token: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "invalid_token" ? "Invalid code. Try again." : data.error);
      setEnabled(true);
      setStep("backup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupSms = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/mfa/sms/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSmsSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexpay-backup-codes-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-6">
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {step === "choose" && (
          <>
            <div className="text-center mb-8">
              <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white">Set up two-factor authentication</h1>
              <p className="text-gray-400 text-sm mt-2">Add an extra layer of security to your account</p>
            </div>
            <div className="space-y-4">
              <button
                onClick={setupTotp}
                disabled={loading}
                className="w-full flex items-center gap-4 bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition text-left"
              >
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">Authenticator app</h3>
                  <p className="text-gray-400 text-sm">Google Authenticator, Authy, or any TOTP app</p>
                </div>
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> : null}
              </button>
              <button
                onClick={() => setStep("sms")}
                className="w-full flex items-center gap-4 bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition text-left"
              >
                <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">SMS authentication</h3>
                  <p className="text-gray-400 text-sm">Receive codes via text message</p>
                </div>
              </button>
            </div>
          </>
        )}

        {step === "totp" && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">Scan QR code</h2>
              <p className="text-gray-400 text-sm mt-1">Scan with your authenticator app</p>
            </div>
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={uri || "otpauth://"} size={192} />
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-500 mb-1">Or enter this key manually:</p>
              <p className="text-sm font-mono text-white break-all">{secret}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); enableTotp(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Verify code</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-center text-lg tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={loading || verifyCode.length < 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enable 2FA"}
              </Button>
            </form>
          </>
        )}

        {step === "backup" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Two-factor enabled</h2>
              <p className="text-gray-400 text-sm mt-1">Save your backup codes in a safe place</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-3">
                Each code can be used only once. Keep them secure.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div key={i} className="bg-slate-900 rounded-lg px-3 py-2 font-mono text-sm text-white text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={copyBackupCodes} variant="outline" className="flex-1 border-slate-700 text-gray-300">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={downloadBackupCodes} variant="outline" className="flex-1 border-slate-700 text-gray-300">
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
            <Link href="/dashboard">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4">
                Go to Dashboard
              </Button>
            </Link>
          </>
        )}

        {step === "sms" && !smsSent && (
          <form onSubmit={(e) => { e.preventDefault(); setupSms(); }} className="space-y-4">
            <div className="text-center mb-6">
              <Smartphone className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white">SMS authentication</h2>
              <p className="text-gray-400 text-sm mt-1">Enter your phone number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Code"}
            </Button>
          </form>
        )}

        {smsSent && (
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">SMS authentication enabled</h2>
            <p className="text-gray-400 text-sm mt-2 mb-6">You&apos;ll receive login codes via SMS to {phone}</p>
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white">Go to Dashboard</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
