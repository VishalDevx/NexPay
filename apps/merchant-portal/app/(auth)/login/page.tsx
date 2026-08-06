"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout, AuthField, AuthError, authInputClass } from "@/components/auth/auth-layout";
import { getPostLoginPath } from "@/lib/format";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"totp" | "sms" | null>(null);
  const router = useRouter();

  const completeLogin = (token: string, merchant: { kycStatus?: string }) => {
    localStorage.setItem("nexpay_token", token);
    localStorage.setItem("nexpay_merchant", JSON.stringify(merchant));
    router.push(getPostLoginPath(merchant.kycStatus));
  };

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
      if (!res.ok) {
        throw new Error(data.error === "invalid_credentials" ? "Invalid email or password" : data.error);
      }

      if (data.mfaRequired) {
        setMfaMethod(data.totpEnabled ? "totp" : "sms");
        setMfaRequired(true);
        return;
      }

      completeLogin(data.token, data.merchant);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <AuthLayout title="Two-factor authentication" description="Enter the code from your authenticator app">
        <MfaVerifyForm
          email={email}
          method={mfaMethod!}
          onSuccess={completeLogin}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your merchant account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-blue-400 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="you@company.com"
            required
          />
        </AuthField>

        <AuthField label="Password">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-10`}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </AuthField>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </div>

        <AuthError message={error} />

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
        </Button>
      </form>
    </AuthLayout>
  );
}

function MfaVerifyForm({
  email,
  method,
  onSuccess,
}: {
  email: string;
  method: "totp" | "sms";
  onSuccess: (token: string, merchant: { kycStatus?: string }) => void;
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
      if (!res.ok) {
        throw new Error(data.error === "invalid_totp" ? "Invalid code" : data.error);
      }

      onSuccess(data.token, data.merchant);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <AuthField label={useBackup ? "Backup code" : method === "totp" ? "Authenticator code" : "SMS code"}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${authInputClass} text-center text-lg tracking-widest`}
          placeholder="000000"
          maxLength={useBackup ? 32 : 6}
          required
        />
      </AuthField>
      <AuthError message={error} />
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
      </Button>
      <button
        type="button"
        onClick={() => { setUseBackup(!useBackup); setError(""); }}
        className="w-full text-center text-sm text-gray-500 transition hover:text-gray-300"
      >
        {useBackup ? "Use authenticator code instead" : "Use a backup code"}
      </button>
    </form>
  );
}
