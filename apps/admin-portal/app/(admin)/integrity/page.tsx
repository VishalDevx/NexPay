"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  BarChart3, Layers, Webhook, Wallet, PieChart, Activity, AlertTriangle, XCircle, Clock,
} from "lucide-react";
import { CheckCard } from "@/components/admin/check-card";
import { adminFetch } from "@/lib/admin-api";

export default function IntegrityPage() {
  const [integrity, setIntegrity] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<Record<string, unknown>>("/api/v1/admin/integrity")
      .then(setIntegrity)
      .finally(() => setLoading(false));
  }, []);

  const checks = integrity?.checks as Record<string, {
    ok: boolean;
    message?: string;
    pending?: number;
    retrying?: number;
    count?: number;
    open?: number;
    escalated?: number;
    failed?: number;
    failedPayouts?: number;
    failedDeliveries?: number;
    rate?: number;
    success?: number;
    total?: number;
    drifts?: unknown[];
    lastRun?: string;
  }> | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <BarChart3 className="h-5 w-5 text-blue-400" /> System Integrity
        </h2>
        <Badge variant={integrity?.status === "healthy" ? "success" : "warning"} className="text-xs">
          {loading ? "Checking..." : integrity?.status === "healthy" ? "All Systems Healthy" : "Degraded"}
        </Badge>
      </div>

      {loading ? (
        <Card className="">
          <CardContent className="p-12 text-center text-muted-foreground">Running system integrity checks...</CardContent>
        </Card>
      ) : checks ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CheckCard label="Ledger Balanced" ok={checks.ledgerBalanced?.ok ?? false} detail={checks.ledgerBalanced?.message || ""} icon={Layers} />
            <CheckCard label="Wallet vs Ledger" ok={checks.walletDrift?.ok ?? false} detail={checks.walletDrift?.drifts?.length ? `${checks.walletDrift.drifts.length} wallet(s) have drift` : "All match"} icon={Wallet} />
            <CheckCard label="Webhook Deliveries" ok={checks.pendingWebhookDeliveries?.ok ?? false} detail={`${checks.pendingWebhookDeliveries?.pending ?? 0} pending, ${checks.pendingWebhookDeliveries?.retrying ?? 0} retrying`} icon={Webhook} />
            <CheckCard label="Dead Letter Queue" ok={checks.dlqCount?.ok ?? false} detail={`${checks.dlqCount?.count ?? 0} in DLQ`} icon={XCircle} />
            <CheckCard label="Reconciliation Issues" ok={checks.reconciliationIssues?.ok ?? false} detail={`${checks.reconciliationIssues?.open ?? 0} open, ${checks.reconciliationIssues?.escalated ?? 0} escalated`} icon={PieChart} />
            <CheckCard label="Outbox Lag" ok={checks.outboxLag?.ok ?? false} detail={`${checks.outboxLag?.pending ?? 0} pending, ${checks.outboxLag?.failed ?? 0} failed`} icon={Activity} />
            <CheckCard label="Failed Jobs" ok={checks.failedJobs?.ok ?? false} detail={`${checks.failedJobs?.failedPayouts ?? 0} failed payouts, ${checks.failedJobs?.failedDeliveries ?? 0} failed deliveries`} icon={AlertTriangle} />
            <CheckCard label="Payment Success Rate" ok={checks.paymentSuccessRate?.ok ?? false} detail={`${checks.paymentSuccessRate?.rate ?? 0}% success (${checks.paymentSuccessRate?.success ?? 0}/${checks.paymentSuccessRate?.total ?? 0})`} icon={BarChart3} />
          </div>

          {(checks.walletDrift?.drifts?.length ?? 0) > 0 && (
            <Card className="">
              <CardHeader><CardTitle className="text-sm text-white">Wallet Drift Details</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="">
                      <TableHead className="text-xs text-muted-foreground">Merchant</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Currency</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Drift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(checks.walletDrift?.drifts as Record<string, unknown>[]).map((d, i) => (
                      <TableRow key={i} className="">
                        <TableCell className="text-xs text-foreground">{String(d.merchantId)?.slice(0, 12)}</TableCell>
                        <TableCell className="text-xs text-foreground">{String(d.currency)}</TableCell>
                        <TableCell className="font-mono text-xs text-red-400">{String(d.drift)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card className="">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-white"><Clock className="h-4 w-4" /> Job Timing</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between border-b  py-2">
                <span className="text-sm text-foreground">Last Reconciliation</span>
                <span className="text-sm text-muted-foreground">
                  {checks.lastReconciliation?.lastRun
                    ? new Date(String(checks.lastReconciliation.lastRun)).toLocaleString()
                    : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="">
          <CardContent className="p-12 text-center text-muted-foreground">Unable to load integrity data.</CardContent>
        </Card>
      )}
    </div>
  );
}
