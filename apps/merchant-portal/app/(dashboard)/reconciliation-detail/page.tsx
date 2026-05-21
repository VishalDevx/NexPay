"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Activity, BarChart3, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

const runStatusVariant = (status: string) => {
  const map: Record<string, string> = {
    COMPLETED: "success",
    RUNNING: "info",
    FAILED: "destructive",
    PENDING: "warning",
  };
  return map[status] || "neutral";
};

export default function ReconciliationDetailPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [dailyBalances, setDailyBalances] = useState<any[]>([]);
  const [unreconciled, setUnreconciled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [runsRes, balancesRes, unreconciledRes] = await Promise.all([
          api.get<any>("/reconciliation-deep/runs").catch(() => ({ data: [] })),
          api.get<any>("/reconciliation-deep/daily-balances").catch(() => ({ data: [] })),
          api.get<any>("/reconciliation-deep/unreconciled").catch(() => ({ data: [] })),
        ]);
        setRuns(runsRes.data || runsRes || []);
        setDailyBalances(balancesRes.data || balancesRes || []);
        setUnreconciled(unreconciledRes.data || unreconciledRes || []);
      } catch (err) {
        console.error("Failed to fetch reconciliation data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const summary = {
    totalRuns: runs.length,
    matched: runs.reduce((sum: number, r: any) => sum + (r.matchedCount || r.matched || 0), 0),
    drifted: runs.reduce((sum: number, r: any) => sum + (r.driftedCount || r.drifted || 0), 0),
    autoCorrected: runs.reduce((sum: number, r: any) => sum + (r.autoCorrectedCount || r.autoCorrected || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation Details</h1>
        <p className="text-sm text-gray-500 mt-1">View reconciliation runs, daily balances, and unreconciled adjustments</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: summary.totalRuns, icon: Activity, color: "text-blue-600 bg-blue-50" },
          { label: "Matched", value: summary.matched, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "Drifted", value: summary.drifted, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
          { label: "Auto-Corrected", value: summary.autoCorrected, icon: BarChart3, color: "text-purple-600 bg-purple-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Reconciliation Runs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead>Drifted</TableHead>
                <TableHead>Auto-Corrected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length > 0 ? (
                runs.map((r: any, i: number) => (
                  <TableRow key={r.id || i}>
                    <TableCell className="font-medium">{r.runType || r.type || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={runStatusVariant(r.status) as any}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {r.startedAt ? new Date(r.startedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-emerald-600">{r.matchedCount || r.matched || 0}</TableCell>
                    <TableCell className="font-medium text-amber-600">{r.driftedCount || r.drifted || 0}</TableCell>
                    <TableCell className="font-medium text-purple-600">{r.autoCorrectedCount || r.autoCorrected || 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No reconciliation runs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily Balances</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Opening Balance</TableHead>
                <TableHead>Closing Balance</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Debits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyBalances.length > 0 ? (
                dailyBalances.map((b: any, i: number) => (
                  <TableRow key={b.id || i}>
                    <TableCell className="text-sm">
                      {b.date ? new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">${Number(b.openingBalance || b.opening).toFixed(2)}</TableCell>
                    <TableCell className="font-medium">${Number(b.closingBalance || b.closing).toFixed(2)}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">+${Number(b.credits || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-red-600 font-medium">-${Number(b.debits || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No daily balance data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Unreconciled Adjustments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unreconciled.length > 0 ? (
                unreconciled.map((u: any, i: number) => (
                  <TableRow key={u.id || i}>
                    <TableCell className="font-medium">{u.type || "—"}</TableCell>
                    <TableCell className="font-medium">${Number(u.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[250px] truncate">{u.reason || "—"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {u.date || u.createdAt ? new Date(u.date || u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "RESOLVED" ? "success" : u.status === "PENDING" ? "warning" : "neutral"}>
                        {u.status || "PENDING"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No unreconciled adjustments
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
