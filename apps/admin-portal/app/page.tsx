"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Shield, Users, FileText, Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw,
} from "lucide-react";

type Tab = "health" | "merchants" | "disputes" | "fraud-rules";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("health");
  const [merchants, setMerchants] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [fraudRules, setFraudRules] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const t = localStorage.getItem("nexpay_admin_token");
    if (t) setToken(t);
  }, []);

  const adminFetch = async (path: string, opts?: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", "x-api-key": token || "", ...opts?.headers },
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (tab === "health") adminFetch("/api/v1/admin/health").then(setHealth);
    if (tab === "merchants") adminFetch("/api/v1/admin/merchants").then((d) => setMerchants(d.data || []));
    if (tab === "disputes") adminFetch("/api/v1/admin/disputes").then((d) => setDisputes(d.data || []));
    if (tab === "fraud-rules") adminFetch("/api/v1/admin/fraud-rules").then((d) => setFraudRules(d.data || []));
  }, [tab, token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/v1/merchants/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const t = data.token;
      localStorage.setItem("nexpay_admin_token", t);
      setToken(t);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
              <Shield size={20} className="text-white" />
            </div>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              {loginError && <p className="text-sm text-red-400">{loginError}</p>}
              <Button type="submit" className="w-full">Sign In</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "health" as Tab, label: "System Health", icon: Activity },
    { id: "merchants" as Tab, label: "Merchants", icon: Users },
    { id: "disputes" as Tab, label: "Disputes", icon: FileText },
    { id: "fraud-rules" as Tab, label: "Fraud Rules", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">NexPay Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem("nexpay_admin_token");
              setToken(null);
            }}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-1 mb-8 p-1 bg-card rounded-xl border border-border w-fit">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "health" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {["API", "Database", "Redis"].map((s) => {
              const status = health?.[s?.toLowerCase()] !== undefined
                ? (typeof health[s?.toLowerCase()] === "string" ? health[s?.toLowerCase()] : health?.status)
                : "checking";
              const healthy = status === "healthy" || status === "ok";
              return (
                <Card key={s}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{s}</p>
                      <p className={`text-lg font-bold mt-1 ${healthy ? "text-emerald-400" : "text-red-400"}`}>
                        {healthy ? "Healthy" : "Unhealthy"}
                      </p>
                    </div>
                    {healthy ? (
                      <CheckCircle size={24} className="text-emerald-400" />
                    ) : (
                      <XCircle size={24} className="text-red-400" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "merchants" && (
          <Card>
            <CardHeader>
              <CardTitle>Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(m.status) as any}>{m.status}</Badge></TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(m.kycStatus) as any}>{m.kycStatus}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {m.kycStatus !== "VERIFIED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                adminFetch(`/api/v1/admin/merchants/${m.id}/kyc`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ status: "VERIFIED" }),
                                }).then(() => window.location.reload())
                              }
                            >
                              Verify KYC
                            </Button>
                          )}
                          {m.status !== "SUSPENDED" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                adminFetch(`/api/v1/admin/merchants/${m.id}/status`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ status: "SUSPENDED" }),
                                }).then(() => window.location.reload())
                              }
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {tab === "disputes" && (
          <Card>
            <CardHeader>
              <CardTitle>Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.payment?.id?.slice(0, 12)}...</TableCell>
                      <TableCell>{d.merchant?.name}</TableCell>
                      <TableCell className="capitalize">{d.reason?.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {Number(d.amount)?.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                      </TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(d.status) as any}>{d.status?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>
                        {d.status === "OPEN" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-400 border-emerald-800 hover:bg-emerald-950"
                              onClick={() =>
                                adminFetch(`/api/v1/admin/disputes/${d.id}/resolve`, {
                                  method: "POST",
                                  body: JSON.stringify({ resolution: "merchant_won" }),
                                }).then(() => window.location.reload())
                              }
                            >
                              Merchant Won
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-800 hover:bg-red-950"
                              onClick={() =>
                                adminFetch(`/api/v1/admin/disputes/${d.id}/resolve`, {
                                  method: "POST",
                                  body: JSON.stringify({ resolution: "merchant_lost" }),
                                }).then(() => window.location.reload())
                              }
                            >
                              Merchant Lost
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {tab === "fraud-rules" && (
          <Card>
            <CardHeader>
              <CardTitle>Fraud Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Toggle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudRules.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.scoreWeight}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(r.action) as any}>{r.action}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.enabled ? "success" : "neutral"}>{r.enabled ? "Enabled" : "Disabled"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={r.enabled ? "destructive" : "outline"}
                          onClick={() =>
                            adminFetch(`/api/v1/admin/fraud-rules/${r.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ enabled: !r.enabled }),
                            }).then(() => window.location.reload())
                          }
                        >
                          {r.enabled ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
