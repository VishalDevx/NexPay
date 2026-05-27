"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Shield, Users, FileText, Activity, AlertTriangle, CheckCircle, XCircle,
  Search, Ban, Sliders, Eye, RefreshCw, DollarSign, Clock, Server,
  Database, Globe, Lock, Unlock, Plus, Save, ChevronDown, BarChart3,
  Layers, Webhook, Wallet, PieChart,
} from "lucide-react";
import Link from "next/link";

type Tab = "health" | "merchants" | "kyc" | "disputes" | "fraud-rules" | "investigation" | "ledger-adjust" | "rate-limit" | "integrity";

const defaultHealth = {
  api: "healthy", database: "healthy", redis: "healthy",
  bullmq: [{ queue: "webhook-delivery", depth: 0 }, { queue: "payout-processing", depth: 0 }, { queue: "reconciliation", depth: 0 }],
  redisMetrics: { memory: "-", hitRate: "-", connections: 0 },
  db: { connections: 0, poolSize: 20, activeQueries: 0 },
  latency: { p50: "-", p95: "-", p99: "-" },
  errorRate: "-",
  lastReconciliation: new Date().toISOString(),
};

function CheckCard({ label, ok, detail, icon: Icon }: { label: string; ok: boolean; detail: string; icon: any }) {
  return (
    <Card className={`bg-slate-800 border-slate-700 ${!ok ? "ring-1 ring-amber-500/50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon size={16} className={ok ? "text-emerald-400" : "text-amber-400"} />
            <span className="text-sm font-medium text-gray-200">{label}</span>
          </div>
          {ok ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-amber-400" />}
        </div>
        <p className="text-xs text-gray-500 truncate">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("health");
  const [merchants, setMerchants] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [fraudRules, setFraudRules] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(defaultHealth);
  const [rateLimits, setRateLimits] = useState<any[]>([]);
  const [integrity, setIntegrity] = useState<any>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [showInvestigation, setShowInvestigation] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"DEBIT" | "CREDIT">("CREDIT");
  const [showAdjustForm, setShowAdjustForm] = useState(false);

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
    if (tab === "health") adminFetch("/api/v1/admin/health").then((d) => setHealth(d || defaultHealth));
    if (tab === "rate-limit") adminFetch("/api/v1/admin/rate-limits").then((d) => setRateLimits(d.data || []));
    if (tab === "merchants" || tab === "kyc") adminFetch("/api/v1/admin/merchants").then((d) => setMerchants(d.data || []));
    if (tab === "disputes") adminFetch("/api/v1/admin/disputes").then((d) => setDisputes(d.data || []));
    if (tab === "fraud-rules") adminFetch("/api/v1/admin/fraud-rules").then((d) => setFraudRules(d.data || []));
    if (tab === "integrity") {
      setIntegrityLoading(true);
      adminFetch("/api/v1/admin/integrity").then((d) => { setIntegrity(d); setIntegrityLoading(false); });
    }
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
      localStorage.setItem("nexpay_admin_token", data.token);
      setToken(data.token);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleAdjustment = async () => {
    await adminFetch("/api/v1/admin/ledger-adjustments", {
      method: "POST",
      body: JSON.stringify({ amount: parseFloat(adjustAmount), type: adjustType, reason: adjustReason, accountId: "asset-usd" }),
    });
    setShowAdjustForm(false);
    setAdjustAmount("");
    setAdjustReason("");
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-sm bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
              <Shield size={24} className="text-white" />
            </div>
            <CardTitle className="text-white">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-900 border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-slate-900 border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {loginError && <p className="text-sm text-red-400">{loginError}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white">Sign In</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "health" as Tab, label: "System Health", icon: Activity },
    { id: "merchants" as Tab, label: "Merchants", icon: Users },
    { id: "kyc" as Tab, label: "KYC Queue", icon: Shield },
    { id: "disputes" as Tab, label: "Disputes", icon: FileText },
    { id: "investigation" as Tab, label: "Investigation", icon: Search },
    { id: "fraud-rules" as Tab, label: "Fraud Rules", icon: AlertTriangle },
    { id: "ledger-adjust" as Tab, label: "Ledger Adjust", icon: DollarSign },
    { id: "rate-limit" as Tab, label: "Rate Limits", icon: Ban },
    { id: "integrity" as Tab, label: "Integrity", icon: BarChart3 },
  ];

  const observabilityLink = (
    <Link
      href="/observability"
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
    >
      <Activity size={16} />
      Observability
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">NexPay Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="neutral" className="text-xs">Internal</Badge>
            <a
              href="/observability"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Activity className="w-3 h-3" /> Observability
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => { localStorage.removeItem("nexpay_admin_token"); setToken(null); }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-1 mb-8 p-1 bg-slate-800 rounded-xl border border-slate-700 w-fit">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "text-gray-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
          {observabilityLink}
        </div>

        {tab === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["API", "Database", "Redis"].map((s) => {
                const status = health?.[s?.toLowerCase()] !== undefined
                  ? (typeof health[s?.toLowerCase()] === "string" ? health[s?.toLowerCase()] : health?.status)
                  : "checking";
                const healthy = status === "healthy" || status === "ok";
                return (
                  <Card key={s} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">{s}</p>
                        <p className={`text-lg font-bold mt-1 ${healthy ? "text-emerald-400" : "text-red-400"}`}>
                          {healthy ? "Healthy" : "Unhealthy"}
                        </p>
                      </div>
                      {healthy ? <CheckCircle size={24} className="text-emerald-400" /> : <XCircle size={24} className="text-red-400" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Server className="w-4 h-4" /> System Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">API Latency</p>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(health?.latency || defaultHealth.latency).map(([k, v]) => (
                        <div key={k} className="bg-slate-900 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">{k.toUpperCase()}</p>
                          <p className="text-lg font-bold text-white">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-gray-500">Error Rate</p>
                      <p className="text-white font-medium">{health?.errorRate || "-"}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-gray-500">Redis Hit Rate</p>
                      <p className="text-white font-medium">{(health?.redisMetrics as any)?.hitRate || "-"}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-gray-500">DB Connections</p>
                      <p className="text-white font-medium">{(health?.db as any)?.connections || 0}/{(health?.db as any)?.poolSize || 20}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-gray-500">Redis Memory</p>
                      <p className="text-white font-medium">{(health?.redisMetrics as any)?.memory || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Clock className="w-4 h-4" /> BullMQ Queues</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-400">Queue</TableHead>
                        <TableHead className="text-gray-400">Depth</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(health?.bullmq || defaultHealth.bullmq).map((q: any) => (
                        <TableRow key={q.queue} className="border-slate-700">
                          <td className="py-2 text-sm text-gray-300">{q.queue}</td>
                          <td className="py-2 text-sm text-gray-300">{q.depth}</td>
                          <td className="py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${q.depth > 10 ? "bg-yellow-900/50 text-yellow-400" : "bg-emerald-900/50 text-emerald-400"}`}>
                              {q.depth > 10 ? "Stressed" : "Healthy"}
                            </span>
                          </td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 pt-4 border-t border-slate-700 text-sm text-gray-400">
                    Last reconciliation: {health?.lastReconciliation ? new Date(health.lastReconciliation).toLocaleString() : "N/A"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {tab === "merchants" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader><CardTitle className="text-white">Merchants</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Email</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">KYC</TableHead>
                    <TableHead className="text-gray-400">Volume</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants.map((m: any) => (
                    <TableRow key={m.id} className="border-slate-700">
                      <TableCell className="text-white font-medium">{m.name}</TableCell>
                      <TableCell className="text-gray-300">{m.email}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(m.status) as any}>{m.status}</Badge></TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(m.kycStatus) as any}>{m.kycStatus}</Badge></TableCell>
                      <TableCell className="text-gray-300">{m.expectedMonthlyVolume || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-gray-300" onClick={() => { setSelectedMerchant(m); setShowInvestigation(true); }}>
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          {m.kycStatus !== "VERIFIED" && (
                            <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-800"
                              onClick={() => adminFetch(`/api/v1/admin/merchants/${m.id}/kyc`, { method: "PATCH", body: JSON.stringify({ status: "VERIFIED" }) }).then(() => window.location.reload())}>
                              Verify KYC
                            </Button>
                          )}
                          {m.status !== "SUSPENDED" && (
                            <Button size="sm" variant="destructive"
                              onClick={() => adminFetch(`/api/v1/admin/merchants/${m.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "SUSPENDED" }) }).then(() => window.location.reload())}>
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

        {tab === "kyc" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader><CardTitle className="text-white">KYC Approval Queue</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Merchant</TableHead>
                    <TableHead className="text-gray-400">Documents</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Submitted</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants.filter((m) => m.kycStatus !== "VERIFIED").length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">All KYC reviews completed</TableCell></TableRow>
                  ) : (
                    merchants.filter((m) => m.kycStatus !== "VERIFIED").map((m: any) => (
                      <TableRow key={m.id} className="border-slate-700">
                        <TableCell>
                          <p className="text-white font-medium">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.email}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {["PAN", "GST", "Bank Stmt"].map((doc) => (
                              <Button key={doc} variant="ghost" size="sm" className="text-xs text-blue-400">View {doc}</Button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(m.kycStatus) as any}>{m.kycStatus}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-400">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white"
                              onClick={() => adminFetch(`/api/v1/admin/merchants/${m.id}/kyc`, { method: "PATCH", body: JSON.stringify({ status: "VERIFIED" }) }).then(() => window.location.reload())}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white"
                              onClick={() => adminFetch(`/api/v1/admin/merchants/${m.id}/kyc`, { method: "PATCH", body: JSON.stringify({ status: "REJECTED" }) }).then(() => window.location.reload())}>
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {tab === "investigation" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-4">
                <CardTitle className="text-white">Transaction Investigation</CardTitle>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input placeholder="Search by payment ID..." className="pl-9 bg-slate-900 border-slate-700 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 rounded-xl p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Audit Trail", value: "12 state changes" },
                    { label: "Ledger Entries", value: "8 entries" },
                    { label: "Fraud Events", value: "3 rules triggered" },
                    { label: "Actions", value: "Refund available" },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-sm font-medium text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button className="bg-amber-600 hover:bg-amber-500 text-white"><RefreshCw className="w-4 h-4 mr-1" /> Manual Refund</Button>
                  <Button className="bg-red-600 hover:bg-red-500 text-white"><Ban className="w-4 h-4 mr-1" /> Freeze Merchant</Button>
                  <Button variant="outline" className="border-slate-600 text-gray-300"><Eye className="w-4 h-4 mr-1" /> View Raw Ledger</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "disputes" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader><CardTitle className="text-white">Disputes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Payment</TableHead>
                    <TableHead className="text-gray-400">Merchant</TableHead>
                    <TableHead className="text-gray-400">Reason</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((d: any) => (
                    <TableRow key={d.id} className="border-slate-700">
                      <TableCell className="font-mono text-xs">{d.payment?.id?.slice(0, 12)}...</TableCell>
                      <TableCell className="text-gray-300">{d.merchant?.name}</TableCell>
                      <TableCell className="capitalize text-gray-300">{d.reason?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-white font-medium">${Number(d.amount)?.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(d.status) as any}>{d.status?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>
                        {(d.status === "RAISED" || d.status === "UNDER_REVIEW") && (
                          <div className="flex gap-2">
                            <Button size="sm" className="text-emerald-400 border-emerald-800 bg-transparent border hover:bg-emerald-950"
                              onClick={() => adminFetch(`/api/v1/admin/disputes/${d.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "merchant_won" }) }).then(() => window.location.reload())}>
                              Merchant Won
                            </Button>
                            <Button size="sm" className="text-red-400 border-red-800 bg-transparent border hover:bg-red-950"
                              onClick={() => adminFetch(`/api/v1/admin/disputes/${d.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "merchant_lost" }) }).then(() => window.location.reload())}>
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
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Fraud Rules</CardTitle>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white" size="sm"><Plus className="w-4 h-4 mr-1" /> Create Rule</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Weight</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">Condition</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Toggle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudRules.map((r: any) => (
                    <TableRow key={r.id} className="border-slate-700">
                      <TableCell className="text-white font-medium">{r.name}</TableCell>
                      <TableCell className="text-gray-300">{r.scoreWeight}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(r.action) as any}>{r.action}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-400 font-mono">{JSON.stringify(r.condition).slice(0, 40)}...</TableCell>
                      <TableCell><Badge variant={r.enabled ? "success" : "neutral"}>{r.enabled ? "Enabled" : "Disabled"}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant={r.enabled ? "destructive" : "outline"} className={r.enabled ? "" : "border-slate-600 text-gray-300"}
                          onClick={() => adminFetch(`/api/v1/admin/fraud-rules/${r.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !r.enabled }) }).then(() => window.location.reload())}>
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

        {tab === "ledger-adjust" && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Manual Ledger Adjustments</CardTitle>
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white" size="sm" onClick={() => setShowAdjustForm(true)}>
                    <Plus className="w-4 h-4 mr-1" /> New Adjustment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-gray-400">ID</TableHead>
                      <TableHead className="text-gray-400">Amount</TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Reason</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Approved By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-slate-700">
                      <TableCell className="font-mono text-xs">adj_001</TableCell>
                      <TableCell className="font-medium text-white">$250.00</TableCell>
                      <TableCell><span className="text-emerald-400 font-medium">CREDIT</span></TableCell>
                      <TableCell className="text-sm text-gray-300">Fee refund - goodwill</TableCell>
                      <TableCell><Badge variant="warning">Pending Approval</Badge></TableCell>
                      <TableCell className="text-gray-400">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {showAdjustForm && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white">New Ledger Adjustment</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
                      <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)}
                        className="w-full bg-slate-900 border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                      <Select value={adjustType} onChange={(e: any) => setAdjustType(e.target.value)}>
                        <option value="CREDIT">Credit</option>
                        <option value="DEBIT">Debit</option>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Reason / Justification</label>
                      <textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} rows={3}
                        className="w-full bg-slate-900 border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-sm text-amber-400 font-medium">Dual-approval required</p>
                    <p className="text-xs text-amber-500 mt-1">This adjustment requires approval from a second admin before posting.</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" className="border-slate-600 text-gray-300" onClick={() => setShowAdjustForm(false)}>Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleAdjustment} disabled={!adjustAmount || !adjustReason}>
                      <Save className="w-4 h-4 mr-1" /> Submit for Approval
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "rate-limit" && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader><CardTitle className="text-white">Rate Limit Override</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input placeholder="Enter IP address" className="bg-slate-900 border-slate-700 text-white flex-1" />
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white"><Unlock className="w-4 h-4 mr-1" /> Unblock</Button>
                  <Button variant="outline" className="border-slate-600 text-gray-300"><Lock className="w-4 h-4 mr-1" /> Add Allowlist</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader><CardTitle className="text-white">Blocked IPs</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-gray-400">IP Address</TableHead>
                      <TableHead className="text-gray-400">Endpoint</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Reason</TableHead>
                      <TableHead className="text-gray-400">Blocked Until</TableHead>
                      <TableHead className="text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rateLimits.length > 0 ? rateLimits : []).map((r: any, i: number) => (
                      <TableRow key={r.ip} className="border-slate-700">
                        <TableCell className="font-mono text-sm text-white">{r.ip}</TableCell>
                        <TableCell className="text-sm text-gray-300">{r.endpoint}</TableCell>
                        <TableCell><Badge variant={r.blocked ? "destructive" : "success"}>{r.blocked ? "Blocked" : "Active"}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-300">{r.reason || "—"}</TableCell>
                        <TableCell className="text-xs text-gray-400">{r.blockedUntil ? new Date(r.blockedUntil).toLocaleString() : "—"}</TableCell>
                        <TableCell>
                          {r.blocked && (
                            <Button size="sm" variant="outline" className="border-slate-600 text-gray-300">
                              <Unlock className="w-3 h-3 mr-1" /> Unblock
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "integrity" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                System Integrity
              </h2>
              <Badge variant={integrity?.status === "healthy" ? "success" : integrity?.status === "degraded" ? "warning" : "neutral"} className="text-xs">
                {integrity ? (integrity.status === "healthy" ? "All Systems Healthy" : "Degraded") : "Checking..."}
              </Badge>
            </div>

            {integrityLoading ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-12 text-center text-gray-500">Running system integrity checks...</CardContent>
              </Card>
            ) : integrity ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CheckCard label="Ledger Balanced" ok={integrity.checks.ledgerBalanced.ok} detail={integrity.checks.ledgerBalanced.message} icon={Layers} />
                  <CheckCard label="Wallet vs Ledger" ok={integrity.checks.walletDrift.ok} detail={integrity.checks.walletDrift.drifts?.length ? `${integrity.checks.walletDrift.drifts.length} wallet(s) have drift` : "All match"} icon={Wallet} />
                  <CheckCard label="Webhook Deliveries" ok={integrity.checks.pendingWebhookDeliveries.ok} detail={`${integrity.checks.pendingWebhookDeliveries.pending} pending, ${integrity.checks.pendingWebhookDeliveries.retrying} retrying`} icon={Webhook} />
                  <CheckCard label="Dead Letter Queue" ok={integrity.checks.dlqCount.ok} detail={`${integrity.checks.dlqCount.count} in DLQ`} icon={XCircle} />
                  <CheckCard label="Reconciliation Issues" ok={integrity.checks.reconciliationIssues.ok} detail={`${integrity.checks.reconciliationIssues.open} open, ${integrity.checks.reconciliationIssues.escalated} escalated`} icon={PieChart} />
                  <CheckCard label="Outbox Lag" ok={integrity.checks.outboxLag.ok} detail={`${integrity.checks.outboxLag.pending} pending, ${integrity.checks.outboxLag.failed} failed`} icon={Activity} />
                  <CheckCard label="Failed Jobs" ok={integrity.checks.failedJobs.ok} detail={`${integrity.checks.failedJobs.failedPayouts} failed payouts, ${integrity.checks.failedJobs.failedDeliveries} failed deliveries`} icon={AlertTriangle} />
                  <CheckCard label="Payment Success Rate" ok={integrity.checks.paymentSuccessRate.ok} detail={`${integrity.checks.paymentSuccessRate.rate}% success (${integrity.checks.paymentSuccessRate.success}/${integrity.checks.paymentSuccessRate.total})`} icon={BarChart3} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {integrity.checks.walletDrift.drifts?.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Wallet Drift Details</CardTitle></CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-gray-400 text-xs">Merchant</TableHead>
                              <TableHead className="text-gray-400 text-xs">Currency</TableHead>
                              <TableHead className="text-gray-400 text-xs">Wallet</TableHead>
                              <TableHead className="text-gray-400 text-xs">Ledger</TableHead>
                              <TableHead className="text-gray-400 text-xs">Drift</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {integrity.checks.walletDrift.drifts.map((d: any, i: number) => (
                              <TableRow key={i} className="border-slate-700">
                                <TableCell className="text-xs text-gray-300">{d.merchantId?.slice(0, 12)}</TableCell>
                                <TableCell className="text-xs text-gray-300">{d.currency}</TableCell>
                                <TableCell className="text-xs font-mono text-white">{d.walletBalance}</TableCell>
                                <TableCell className="text-xs font-mono text-white">{d.ledgerBalance}</TableCell>
                                <TableCell className="text-xs font-mono text-red-400">{d.drift}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Job Timing</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-sm text-gray-300">Last Reconciliation</span>
                        <span className="text-sm text-gray-400">{integrity.checks.lastReconciliation.lastRun ? new Date(integrity.checks.lastReconciliation.lastRun).toLocaleString() : "Never"}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-sm text-gray-300">Last Cron (Reconciliation)</span>
                        <span className="text-sm text-gray-400">{integrity.checks.lastCronRuns.reconciliation !== "never" ? new Date(integrity.checks.lastCronRuns.reconciliation).toLocaleString() : "Never"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-12 text-center text-gray-500">Unable to load integrity data. Check API connectivity.</CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
