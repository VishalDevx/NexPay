"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, RefreshCw,
} from "lucide-react";

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState<"ledger" | "reconciliation" | "alerts">("ledger");
  const [ledgerFilter, setLedgerFilter] = useState("ALL");
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [reconciliationReport, setReconciliationReport] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ledgerRes, reportRes, jobsRes, alertsRes] = await Promise.all([
          api.get<any>("/reconciliation/ledger?limit=50"),
          api.get<any>("/reconciliation/report"),
          api.get<any>("/reconciliation/jobs"),
          api.get<any>("/reconciliation/alerts"),
        ]);
        setLedgerEntries(ledgerRes.data || []);
        setReconciliationReport(reportRes.data || []);
        setJobs(jobsRes.data || []);
        setAlerts(alertsRes.data || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filteredEntries = ledgerFilter === "ALL" ? ledgerEntries : ledgerEntries.filter((e) => e.accountType === ledgerFilter);

  const handleRunReconciliation = async () => {
    setCorrecting(true);
    try {
      await api.post("/reconciliation/report/correct");
      const [reportRes, ledgerRes] = await Promise.all([
        api.get<any>("/reconciliation/report"),
        api.get<any>("/reconciliation/ledger?limit=50"),
      ]);
      setReconciliationReport(reportRes.data || []);
      setLedgerEntries(ledgerRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setCorrecting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation & Ledger</h1>
        <p className="text-sm text-gray-500 mt-1">Browse the double-entry ledger and monitor reconciliation</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        {(["ledger", "reconciliation", "alerts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "ledger" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Ledger Explorer
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Immutable audit trail — tamper-proof</span>
                <Select value={ledgerFilter} onChange={(e) => setLedgerFilter(e.target.value)} className="w-32">
                  <option value="ALL">All Accounts</option>
                  <option value="ASSET">Asset</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EXPENSE">Expense</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>))}</TableRow>
                  ))
                ) : (
                  filteredEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.id}</TableCell>
                      <TableCell><Badge variant={e.accountType === "ASSET" ? "success" : e.accountType === "REVENUE" ? "info" : e.accountType === "LIABILITY" ? "warning" : "neutral"}>{e.accountType}</Badge></TableCell>
                      <TableCell><span className={e.type === "DEBIT" ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>{e.type}</span></TableCell>
                      <TableCell className="font-medium">${e.amount?.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">${e.balanceAfter?.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{e.description}</TableCell>
                      <TableCell className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nightly Reconciliation Report</CardTitle>
                <Badge variant="info">{new Date().toLocaleDateString()}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Redis Balance</TableHead>
                    <TableHead>Ledger Balance</TableHead>
                    <TableHead>Drift</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>))}</TableRow>
                      ))
                    : reconciliationReport.map((r, i) => (
                        <TableRow key={r.currency || i}>
                          <TableCell className="font-medium">{r.currency}</TableCell>
                          <TableCell>${r.redisBalance?.toFixed(2)}</TableCell>
                          <TableCell>${r.ledgerBalance?.toFixed(2)}</TableCell>
                          <TableCell className={r.drift > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                            {r.drift > 0 ? `+$${r.drift?.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === "matched" ? "success" : "warning"}>
                              {r.status === "matched" ? "Matched" : "Auto-corrected"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
                <span className="text-gray-500">Last reconciled: {new Date().toLocaleString()}</span>
                <Button variant="outline" size="sm" onClick={handleRunReconciliation} disabled={correcting}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${correcting ? "animate-spin" : ""}`} /> Run Reconciliation
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>))}</TableRow>
                      ))
                    : jobs.map((job) => (
                        <TableRow key={job.id || job.name}>
                          <TableCell className="font-medium">{job.name}</TableCell>
                          <TableCell className="text-sm">{job.schedule}</TableCell>
                          <TableCell className="text-xs text-gray-500">{new Date(job.lastRun).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-gray-500">{new Date(job.nextRun).toLocaleString()}</TableCell>
                          <TableCell><Badge variant={job.status === "healthy" ? "success" : "warning"}>{job.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "alerts" && (
        <Card>
          <CardHeader><CardTitle>Alert History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>))}</TableRow>
                    ))
                  : alerts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="capitalize">{a.type}</TableCell>
                        <TableCell className="text-sm">{a.message}</TableCell>
                        <TableCell>
                          <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "major" ? "warning" : "neutral"}>
                            {a.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.status === "resolved" ? "success" : "warning"}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{new Date(a.date || a.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
