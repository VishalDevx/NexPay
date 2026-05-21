"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Search, Filter, AlertCircle, CheckCircle2, Clock,
  RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";

const mockLedgerEntries = [
  { id: "le_001", accountType: "ASSET", type: "DEBIT", amount: 249.00, currency: "USD", balanceAfter: 12430.50, description: "Payment capture - pay_001", createdAt: new Date().toISOString() },
  { id: "le_002", accountType: "REVENUE", type: "CREDIT", amount: 249.00, currency: "USD", balanceAfter: 249.00, description: "Revenue recognition - pay_001", createdAt: new Date().toISOString() },
  { id: "le_003", accountType: "ASSET", type: "CREDIT", amount: 50.00, currency: "USD", balanceAfter: 12380.50, description: "Refund - pay_002", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "le_004", accountType: "LIABILITY", type: "DEBIT", amount: 199.00, currency: "USD", balanceAfter: 199.00, description: "Dispute reserve - pay_003", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "le_005", accountType: "EXPENSE", type: "DEBIT", amount: 7.50, currency: "USD", balanceAfter: 7.50, description: "Processing fee - pay_001", createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const mockReconciliationResults = [
  { currency: "USD", redisBalance: 12430.50, ledgerBalance: 12430.50, drift: 0, status: "matched" },
  { currency: "INR", redisBalance: 84500.00, ledgerBalance: 84499.96, drift: 0.04, status: "auto_corrected" },
  { currency: "EUR", redisBalance: 3200.00, ledgerBalance: 3200.00, drift: 0, status: "matched" },
];

const mockAlerts = [
  { id: "alt_001", type: "drift", message: "INR wallet drift detected: $0.04", severity: "minor", status: "resolved", date: new Date(Date.now() - 86400000).toISOString() },
  { id: "alt_002", type: "webhook", message: "Webhook delivery failure rate > 10%", severity: "major", status: "open", date: new Date(Date.now() - 3600000).toISOString() },
  { id: "alt_003", type: "fraud", message: "Fraud spike detected: 15 declines in 5 minutes", severity: "critical", status: "open", date: new Date().toISOString() },
  { id: "alt_004", type: "job", message: "Payout batch job failed", severity: "major", status: "resolved", date: new Date(Date.now() - 2 * 86400000).toISOString() },
];

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState<"ledger" | "reconciliation" | "alerts">("ledger");
  const [ledgerFilter, setLedgerFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const filteredEntries = ledgerFilter === "ALL" ? mockLedgerEntries : mockLedgerEntries.filter((e) => e.accountType === ledgerFilter);

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
                      <TableCell className="font-medium">${e.amount.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">${e.balanceAfter.toFixed(2)}</TableCell>
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
                  {mockReconciliationResults.map((r) => (
                    <TableRow key={r.currency}>
                      <TableCell className="font-medium">{r.currency}</TableCell>
                      <TableCell>${r.redisBalance.toFixed(2)}</TableCell>
                      <TableCell>${r.ledgerBalance.toFixed(2)}</TableCell>
                      <TableCell className={r.drift > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                        {r.drift > 0 ? `+$${r.drift.toFixed(2)}` : "—"}
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
                <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1" /> Run Reconciliation</Button>
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
                  {[
                    { name: "Reconciliation", schedule: "Daily 2:00 AM", lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 86400000).toISOString(), status: "healthy" },
                    { name: "Payout Batch", schedule: "Every 6 hours", lastRun: new Date(Date.now() - 7200000).toISOString(), nextRun: new Date(Date.now() + 14400000).toISOString(), status: "healthy" },
                    { name: "IP Unblock Cleanup", schedule: "Every 30 min", lastRun: new Date(Date.now() - 600000).toISOString(), nextRun: new Date(Date.now() + 1200000).toISOString(), status: "healthy" },
                    { name: "Stale Idempotency Keys", schedule: "Hourly", lastRun: new Date(Date.now() - 1800000).toISOString(), nextRun: new Date(Date.now() + 3600000).toISOString(), status: "healthy" },
                  ].map((job) => (
                    <TableRow key={job.name}>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell className="text-sm">{job.schedule}</TableCell>
                      <TableCell className="text-xs text-gray-500">{new Date(job.lastRun).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-gray-500">{new Date(job.nextRun).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="success">Healthy</Badge></TableCell>
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
                {mockAlerts.map((a) => (
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
                    <TableCell className="text-xs text-gray-500">{new Date(a.date).toLocaleString()}</TableCell>
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
