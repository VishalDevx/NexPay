"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, AlertCircle, CheckCircle2, Activity,
  Wallet, Globe, Bell, ArrowUpRight, ArrowDownRight, RefreshCw,
  Banknote, Clock, ShieldAlert, Webhook, Ban, Users,
} from "lucide-react";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const mockLiveTransactions = [
  { id: "txn_001", amount: 249.99, currency: "USD", status: "CAPTURED", customer: "alice@example.com", time: "2 min ago" },
  { id: "txn_002", amount: 1500.00, currency: "INR", status: "SETTLED", customer: "bob@corp.com", time: "5 min ago" },
  { id: "txn_003", amount: 89.50, currency: "EUR", status: "PROCESSING", customer: "carol@shop.com", time: "7 min ago" },
  { id: "txn_004", amount: 420.00, currency: "GBP", status: "FAILED", customer: "dave@test.com", time: "12 min ago" },
  { id: "txn_005", amount: 1250.00, currency: "USD", status: "AUTHORIZED", customer: "eve@store.com", time: "15 min ago" },
  { id: "txn_006", amount: 67.99, currency: "USD", status: "REFUNDED", customer: "frank@buy.com", time: "18 min ago" },
  { id: "txn_007", amount: 3200.00, currency: "INR", status: "CAPTURED", customer: "grace@inc.com", time: "22 min ago" },
  { id: "txn_008", amount: 199.00, currency: "EUR", status: "DISPUTED", customer: "hank@biz.com", time: "30 min ago" },
];

const mockAlerts = [
  { type: "webhook", label: "Webhook endpoint failing", endpoint: "https://api.myapp.com/webhooks/nexpay", severity: "error" },
  { type: "rate_limit", label: "IP rate-limited", detail: "203.0.113.42 (10 failed attempts)", severity: "warning" },
  { type: "dispute", label: "Pending dispute", detail: "txn_008 - $199.00 - Reason: service_not_received", severity: "warning" },
  { type: "reconciliation", label: "Reconciliation drift", detail: "USD wallet: $0.04 discrepancy auto-corrected", severity: "info" },
];

const mockFxRates = [
  { pair: "USD/INR", rate: "83.45", change: "+0.23%" },
  { pair: "EUR/USD", rate: "1.08", change: "-0.12%" },
  { pair: "GBP/USD", rate: "1.27", change: "+0.08%" },
];

export default function DashboardPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [sandboxMode, setSandboxMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/charges`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const captured = payments.filter((p) => p.status === "CAPTURED" || p.status === "SETTLED");
  const failed = payments.filter((p) => p.status === "FAILED");
  const revenue = captured.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const avgTicket = captured.length > 0 ? revenue / captured.length : 0;
  const failureRate = payments.length > 0 ? ((failed.length / payments.length) * 100).toFixed(1) : "0";

  const chartData = payments
    .filter((p) => p.createdAt)
    .reduce((acc: any, p: any) => {
      const date = new Date(p.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + Number(p.amount);
      return acc;
    }, {});

  const revenueChart = Object.entries(chartData).map(([date, amount]) => ({ date, amount }));

  const currencyData = payments.reduce((acc: any, p: any) => {
    const curr = p.currency || "USD";
    acc[curr] = (acc[curr] || 0) + Number(p.amount);
    return acc;
  }, {});
  const currencyChart = Object.entries(currencyData).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {sandboxMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-medium text-amber-800">Sandbox mode — test data only</span>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700" onClick={() => {
            if (confirm("Switch to live mode? All data and keys will switch context.")) setSandboxMode(false);
          }}>
            Switch to Live
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time overview of your payment activity</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={sandboxMode ? "default" : "outline"}
            size="sm"
            onClick={() => setSandboxMode(!sandboxMode)}
            className={sandboxMode ? "bg-amber-600 hover:bg-amber-500 text-white" : ""}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {sandboxMode ? "Sandbox" : "Live"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                {loading ? <Skeleton className="h-8 w-24 mt-1" /> : <p className="text-2xl font-bold mt-1">${revenue.toFixed(2)}</p>}
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Successful Txns</p>
                {loading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold mt-1 text-emerald-600">{captured.length}</p>}
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Failure Rate</p>
                {loading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold mt-1 text-red-600">{failureRate}%</p>}
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Ticket Size</p>
                {loading ? <Skeleton className="h-8 w-24 mt-1" /> : <p className="text-2xl font-bold mt-1 text-violet-600">${avgTicket.toFixed(2)}</p>}
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <TrendingUp size={24} className="text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue</CardTitle>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {(["daily", "weekly", "monthly"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setRevenuePeriod(p)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                      revenuePeriod === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">No transaction data yet</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Currency Split</CardTitle></CardHeader>
            <CardContent>
              {currencyChart.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={currencyChart} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                        {currencyChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {currencyChart.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-500">${Number(c.value).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>FX Rates</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockFxRates.map((fx) => (
                  <div key={fx.pair} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{fx.pair}</span>
                    <div className="flex items-center gap-2">
                      <span>{fx.rate}</span>
                      <span className={`text-xs ${fx.change.startsWith("+") ? "text-emerald-600" : "text-red-600"}`}>
                        {fx.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4" /> Live Transactions
              </CardTitle>
              <Badge variant="success" className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {mockLiveTransactions.slice(0, 6).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium">${txn.amount.toFixed(2)} {txn.currency}</p>
                      <p className="text-xs text-gray-500 truncate">{txn.customer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={txn.status as any}>{txn.status}</Badge>
                    <span className="text-xs text-gray-400 w-16 text-right">{txn.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">$12,430.50</p>
                  <p className="text-sm text-gray-500">USD Balance</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Pending Settlement</p>
                    <p className="font-semibold">$3,240.00</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-amber-600">Frozen (Disputed)</p>
                    <p className="font-semibold text-amber-700">$199.00</p>
                  </div>
                </div>
                <Link href="/payouts">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                    <Banknote className="w-4 h-4 mr-1" /> Schedule Payout
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4" /> Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {mockAlerts.map((alert, i) => (
                  <div key={i} className="px-6 py-3 flex items-start gap-3">
                    {alert.type === "webhook" && <Webhook className="w-4 h-4 text-red-500 mt-0.5" />}
                    {alert.type === "rate_limit" && <Ban className="w-4 h-4 text-amber-500 mt-0.5" />}
                    {alert.type === "dispute" && <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5" />}
                    {alert.type === "reconciliation" && <RefreshCw className="w-4 h-4 text-blue-500 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.label}</p>
                      <p className="text-xs text-gray-500 truncate">{"endpoint" in alert ? alert.endpoint : alert.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
