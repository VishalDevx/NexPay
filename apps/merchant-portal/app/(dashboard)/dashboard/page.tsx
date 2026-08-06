"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, AlertCircle, CheckCircle2, Activity,
  Wallet, Bell, Banknote, ShieldAlert, Webhook, RefreshCw,
} from "lucide-react";
import {
  useRevenue,
  useRecentPayments,
  useWalletBalances,
  usePayouts,
  useReserveConfig,
  useDashboardAlerts,
  useDashboardMetrics,
} from "@/lib/hooks/use-dashboard";
import { formatMoney, timeAgo } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import type { RevenuePeriod } from "@/lib/types/api";

const CHART_COLORS = ["#18181b", "#71717a", "#a1a1aa", "#d4d4d8"];

export default function DashboardPage() {
  const { merchant } = useAuth();
  const currency = merchant?.baseCurrency || "USD";
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("daily");

  const { data: revenueRes, isLoading: revenueLoading } = useRevenue(revenuePeriod);
  const { data: paymentsRes, isLoading: paymentsLoading } = useRecentPayments(6);
  const { data: metricsPaymentsRes } = useRecentPayments(100);
  const { data: walletRes, isLoading: walletLoading } = useWalletBalances();
  const { data: payoutsRes, isLoading: payoutsLoading } = usePayouts();
  const { data: reserveRes, isLoading: reserveLoading } = useReserveConfig();
  const { alerts, isLoading: alertsLoading } = useDashboardAlerts();

  const revenueData = useMemo(
    () => (revenueRes?.data ?? []).map((r) => ({ date: r.date, amount: Number(r.revenue) })),
    [revenueRes]
  );

  const transactions = paymentsRes?.data ?? [];
  const metrics = useDashboardMetrics(revenueRes?.data, metricsPaymentsRes?.data);
  const walletBalances = walletRes?.data ?? [];
  const primaryWallet = walletBalances.find((w) => w.currency === currency) ?? walletBalances[0];
  const pendingPayouts = (payoutsRes?.data ?? [])
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((s, p) => s + Number(p.amount), 0);
  const reserveBalance = Number(reserveRes?.currentReserveBalance ?? 0);
  const loading = revenueLoading || paymentsLoading;

  const currencyChartData = useMemo(() => {
    const map = transactions.reduce((acc: Record<string, number>, p) => {
      const curr = p.currency || currency;
      acc[curr] = (acc[curr] || 0) + Number(p.amount);
      return acc;
    }, {});
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions, currency]);

  return (
    <div>
      <PageHeader
        title="Home"
        description={`Welcome back${merchant?.name ? `, ${merchant.name}` : ""}`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(metrics.revenue, currency)} icon={DollarSign} loading={loading} />
        <StatCard label="Transactions" value={String(metrics.successCount)} icon={CheckCircle2} loading={loading} />
        <StatCard label="Failure rate" value={metrics.failureRate} icon={AlertCircle} loading={loading} />
        <StatCard label="Avg. ticket" value={formatMoney(metrics.avgTicket, currency)} icon={TrendingUp} loading={loading} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Revenue</CardTitle>
            <div className="flex rounded-md border p-0.5">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRevenuePeriod(p)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                    revenuePeriod === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {revenueLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => formatMoney(v, currency)}
                  />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-[13px] text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Wallet</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-0">
            {walletLoading || payoutsLoading || reserveLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">
                    {formatMoney(primaryWallet?.balance ?? 0, primaryWallet?.currency ?? currency)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Available balance</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-md bg-muted/50 p-2.5">
                    <p className="text-muted-foreground">Pending</p>
                    <p className="font-medium tabular-nums">{formatMoney(pendingPayouts, currency)}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2.5">
                    <p className="text-muted-foreground">Reserve</p>
                    <p className="font-medium tabular-nums">{formatMoney(reserveBalance, currency)}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/payouts"><Banknote className="h-3.5 w-3.5" /> Schedule payout</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" /> Recent
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {paymentsLoading ? (
              <div className="space-y-2 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : transactions.length > 0 ? (
              <div className="divide-y">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between px-5 py-3 text-[13px] hover:bg-muted/30">
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">{formatMoney(Number(txn.amount), txn.currency)}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {txn.customer?.email || txn.id.slice(0, 14)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="neutral" className="text-[10px] font-normal">{txn.status}</Badge>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {txn.createdAt ? timeAgo(txn.createdAt) : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-[13px] text-muted-foreground">No transactions</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {currencyChartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Currencies</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie data={currencyChartData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                      {currencyChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-3.5 w-3.5 text-muted-foreground" /> Alerts</CardTitle></CardHeader>
            <CardContent className="p-0 pt-0">
              {alertsLoading ? (
                <div className="space-y-2 p-5">{[1, 2].map((i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : alerts.length > 0 ? (
                <div className="divide-y">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex gap-2.5 px-5 py-3 text-[13px]">
                      {alert.type === "webhook" && <Webhook className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      {alert.type === "dispute" && <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      {alert.type === "reconciliation" && <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0">
                        <p className="font-medium">{alert.label}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{alert.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-6 text-center text-[13px] text-muted-foreground">All clear</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
