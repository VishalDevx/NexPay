"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Play, CheckCircle, AlertTriangle, XCircle, Search, RefreshCw, RotateCcw, ArrowUpDown, FileText, DollarSign, Activity, Shield, Ban, Eye } from "lucide-react";
import { api } from "@/lib/api";

const matchTypeColors: Record<string, string> = {
  MATCHED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  DRIFTED: "text-amber-700 bg-amber-50 border-amber-200",
  MISSING: "text-red-700 bg-red-50 border-red-200",
  DUPLICATE: "text-purple-700 bg-purple-50 border-purple-200",
  ORPHAN: "text-blue-700 bg-blue-50 border-blue-200",
};

const statusColors: Record<string, string> = {
  COMPLETED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  RUNNING: "text-blue-700 bg-blue-50 border-blue-200",
  FAILED: "text-red-700 bg-red-50 border-red-200",
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
};

const matchStatusColors: Record<string, string> = {
  RESOLVED: "text-emerald-700 bg-emerald-50",
  OPEN: "text-amber-700 bg-amber-50",
  ESCALATED: "text-red-700 bg-red-50",
  IGNORED: "text-gray-500 bg-gray-100",
};

type Tab = "overview" | "runs" | "matches" | "settlements" | "rules";

export default function ReconciliationPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [runsRes, matchesRes, settleRes, rulesRes, summaryRes] = await Promise.all([
        api.get<any>("/reconciliation/runs").catch(() => ({ data: [] })),
        api.get<any>("/reconciliation/matches").catch(() => ({ data: [], total: 0 })),
        api.get<any>("/reconciliation/settlement-batches").catch(() => ({ batches: [] })),
        api.get<any>("/reconciliation/rules").catch(() => ({ data: [] })),
        api.get<any>("/reconciliation/summary").catch(() => ({})),
      ]);
      setRuns(runsRes.data || []);
      setMatches(matchesRes.data || []);
      setSettlements(settleRes.batches || []);
      setRules(rulesRes.data || []);
      setSummary(summaryRes);
    } catch (err) {
      console.error("Failed to fetch reconciliation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRunReconciliation = async (runType?: string) => {
    setRunning(true);
    try {
      await api.post("/reconciliation/runs", { runType: runType || "FULL" });
      await fetchAll();
    } catch (err) {
      console.error("Reconciliation run failed:", err);
    } finally {
      setRunning(false);
    }
  };

  const handleResolve = async (matchId: string) => {
    if (!resolutionText.trim()) return;
    setResolving(matchId);
    try {
      await api.patch(`/reconciliation/matches/${matchId}/resolve`, { resolution: resolutionText });
      setResolutionText("");
      setSelectedMatch(null);
      await fetchAll();
    } catch (err) {
      console.error("Failed to resolve match:", err);
    } finally {
      setResolving(null);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-1">Payment-ledger matching, settlement reconciliation, and exception management</p>
        </div>
        <Button onClick={() => handleRunReconciliation()} disabled={running} className="bg-blue-600 hover:bg-blue-500 text-white">
          {running ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Running...</> : <><Play className="w-4 h-4 mr-1" /> Run Reconciliation</>}
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Open Exceptions", value: summary.openMatches || 0, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
            { label: "Reconciliation Runs", value: summary.recentRuns || 0, icon: Activity, color: "text-blue-600 bg-blue-50" },
            { label: "Unmatched Batches", value: summary.unmatchedBatches || 0, icon: Ban, color: "text-amber-600 bg-amber-50" },
            { label: "Last Run", value: summary.lastRun ? new Date(summary.lastRun.startedAt).toLocaleDateString() : "Never", icon: RefreshCw, color: "text-gray-600 bg-gray-50" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-xl font-bold">{typeof stat.value === "number" ? stat.value : stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: "overview" as Tab, label: "Overview", icon: Activity },
          { id: "runs" as Tab, label: "Run History", icon: RefreshCw },
          { id: "matches" as Tab, label: "Match Results", icon: CheckCircle },
          { id: "settlements" as Tab, label: "Settlements", icon: DollarSign },
          { id: "rules" as Tab, label: "Rules", icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reconciliation Runs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Matched</TableHead>
                    <TableHead className="text-right">Drifted</TableHead>
                    <TableHead className="text-right">Missing</TableHead>
                    <TableHead className="text-right">Orphan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length > 0 ? runs.slice(0, 10).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.runType}</span></TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(r.startedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{r.matchedCount}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">{r.driftedCount}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">{r.missingCount || 0}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{r.orphanCount || 0}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">No reconciliation runs yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Quick Run</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleRunReconciliation("PAYMENT_LEDGER")} disabled={running}>
                    {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Match payments against general ledger entries to find drifts, missing records, and orphan entries.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Settlement Reconciliation</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleRunReconciliation("SETTLEMENT")} disabled={running}>
                    {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Match settlement batches against payments to verify all expected settlements arrived correctly.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "runs" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Run History</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleRunReconciliation()} disabled={running}>
                {running ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                New Run
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Source</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Matched</TableHead>
                  <TableHead className="text-right">Drifted</TableHead>
                  <TableHead className="text-right">Missing</TableHead>
                  <TableHead className="text-right">Orphan</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length > 0 ? runs.map((r: any) => {
                  const duration = r.completedAt ? Math.round((new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000) : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.runType}</span></TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] || ""}`}>{r.status}</span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(r.startedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{r.totalSource}</TableCell>
                      <TableCell className="text-right text-sm">{r.totalTarget}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{r.matchedCount}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">{r.driftedCount}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">{r.missingCount || 0}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{r.orphanCount || 0}</TableCell>
                      <TableCell className="text-sm">{duration !== null ? `${duration}s` : "—"}</TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-gray-400">No runs yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "matches" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Match Results</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="h-8 text-sm border rounded-lg px-2"
                >
                  <option value="">All Types</option>
                  <option value="MATCHED">Matched</option>
                  <option value="DRIFTED">Drifted</option>
                  <option value="MISSING">Missing</option>
                  <option value="ORPHAN">Orphan</option>
                  <option value="DUPLICATE">Duplicate</option>
                </select>
                <Button variant="outline" size="sm" onClick={fetchAll}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Diff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.length > 0 ? (
                  matches.filter((m) => !filterType || m.matchType === filterType).map((m: any) => (
                    <>
                      <TableRow key={m.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedMatch(selectedMatch === m.id ? null : m.id)}>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${matchTypeColors[m.matchType] || ""}`}>
                            {m.matchType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{m.sourceType}#{m.sourceId?.slice(0, 12)}</span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">${Number(m.expectedAmount).toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm">${Number(m.actualAmount || 0).toFixed(2)}</TableCell>
                        <TableCell className={`font-mono text-sm font-medium ${Number(m.difference) > 0 ? "text-red-600" : "text-gray-500"}`}>
                          {Number(m.difference) > 0 ? `+$${Number(m.difference).toFixed(2)}` : "$0.00"}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${matchStatusColors[m.status] || ""}`}>
                            {m.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell><ArrowUpDown className="w-4 h-4 text-gray-400" /></TableCell>
                      </TableRow>
                      {selectedMatch === m.id && (
                        <TableRow key={`${m.id}-detail`}>
                          <TableCell colSpan={8} className="bg-gray-50 p-4">
                            <div className="space-y-3">
                              <div className="text-sm text-gray-600">{m.description || "No description"}</div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-white rounded-lg p-2 border">
                                  <span className="text-gray-500">Match Type</span>
                                  <p className="font-medium">{m.matchType}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border">
                                  <span className="text-gray-500">Target</span>
                                  <p className="font-medium font-mono">{m.targetType ? `${m.targetType}#${m.targetId?.slice(0, 12) || "N/A"}` : "—"}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border">
                                  <span className="text-gray-500">Currency</span>
                                  <p className="font-medium">{m.currency}</p>
                                </div>
                              </div>
                              {m.status !== "RESOLVED" && (
                                <div className="flex items-start gap-2">
                                  <Input
                                    value={resolutionText}
                                    onChange={(e) => setResolutionText(e.target.value)}
                                    placeholder="Enter resolution notes..."
                                    className="flex-1 text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleResolve(m.id)}
                                    disabled={resolving === m.id || !resolutionText.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                  >
                                    {resolving === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Resolve
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">No match results</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "settlements" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Settlement Batches</CardTitle>
              <span className="text-sm text-gray-500">{settlements.length} batches</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Matched</TableHead>
                  <TableHead>Imported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.length > 0 ? settlements.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-medium">{b.reference}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        b.status === "RECONCILED" ? "text-emerald-700 bg-emerald-50" :
                        b.status === "PARTIAL" ? "text-amber-700 bg-amber-50" :
                        b.status === "PENDING" ? "text-blue-700 bg-blue-50" :
                        "text-red-700 bg-red-50"
                      }`}>
                        {b.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-medium">${Number(b.totalAmount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{b._count?.items || b.itemCount}</TableCell>
                    <TableCell className="text-sm">{b.matchedCount}</TableCell>
                    <TableCell className="text-xs text-gray-500">{new Date(b.importedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">No settlement batches</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "rules" && (
        <Card>
          <CardHeader><CardTitle>Reconciliation Rules</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Match Type</TableHead>
                  <TableHead>Source → Target</TableHead>
                  <TableHead>Tolerance</TableHead>
                  <TableHead>Date Window</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length > 0 ? rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{r.matchType}</span>
                    </TableCell>
                    <TableCell className="text-xs">{r.sourceType} → {r.targetType}</TableCell>
                    <TableCell className="text-sm">${Number(r.amountTolerance).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{r.dateWindowHours}h</TableCell>
                    <TableCell className="text-sm">{r.priority}</TableCell>
                    <TableCell>
                      <Badge variant={r.enabled ? "success" : "neutral"}>{r.enabled ? "Enabled" : "Disabled"}</Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">No rules configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
