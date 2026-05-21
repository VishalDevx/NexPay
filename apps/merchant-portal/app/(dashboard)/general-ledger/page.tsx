"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, BookOpen, Scale, ArrowUpDown, RotateCcw, Search, FileText, DollarSign, Percent } from "lucide-react";
import { api } from "@/lib/api";

const typeColors: Record<string, string> = {
  ASSET: "text-blue-600 bg-blue-50 border-blue-200",
  LIABILITY: "text-amber-600 bg-amber-50 border-amber-200",
  REVENUE: "text-emerald-600 bg-emerald-50 border-emerald-200",
  EXPENSE: "text-red-600 bg-red-50 border-red-200",
  EQUITY: "text-purple-600 bg-purple-50 border-purple-200",
};

type Tab = "chart" | "journal" | "trial";

export default function GeneralLedgerPage() {
  const [tab, setTab] = useState<Tab>("chart");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<any>("/gl/accounts").catch(() => ({ data: [] })),
      api.get<any>("/gl/journal").catch(() => ({ data: [], total: 0 })),
      api.get<any>("/gl/trial-balance").catch(() => ({ rows: [] })),
    ]).then(([accRes, entryRes, tbRes]) => {
      setAccounts(accRes.data || []);
      setEntries(entryRes.data || []);
      setTrialBalance(tbRes);
    }).finally(() => setLoading(false));
  }, []);

  const rootAccounts = accounts.filter((a: any) => !a.parentCode);
  const getChildren = (code: string) => accounts.filter((a: any) => a.parentCode === code);

  const filteredAccounts = accounts.filter((a: any) => {
    if (accountFilter && !a.code.includes(accountFilter) && !a.name.toLowerCase().includes(accountFilter.toLowerCase())) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    return true;
  });

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
        <h1 className="text-2xl font-bold">General Ledger</h1>
        <p className="text-sm text-gray-500 mt-1">Chart of accounts, journal entries, and financial reports</p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: "chart" as Tab, label: "Chart of Accounts", icon: BookOpen },
          { id: "journal" as Tab, label: "Journal Entries", icon: FileText },
          { id: "trial" as Tab, label: "Trial Balance", icon: Scale },
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

      {tab === "chart" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chart of Accounts</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search accounts..."
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-48 h-8 text-sm"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 text-sm border rounded-lg px-2"
                >
                  <option value="">All Types</option>
                  <option value="ASSET">Assets</option>
                  <option value="LIABILITY">Liabilities</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expenses</option>
                  <option value="EQUITY">Equity</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.map((acc: any) => (
                    <TableRow key={acc.code}>
                      <TableCell className="font-mono text-xs font-medium">{acc.code}</TableCell>
                      <TableCell>
                        <span className="font-medium">{acc.name}</span>
                        {acc.parentCode && (
                          <span className="text-xs text-gray-400 ml-2">
                            ← {accounts.find((a: any) => a.code === acc.parentCode)?.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[acc.type] || "bg-gray-100 text-gray-600"}`}>
                          {acc.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{acc.category.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Badge variant={acc.isActive ? "success" : "neutral"}>
                          {acc.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No accounts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "journal" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Journal Entries</CardTitle>
                <span className="text-sm text-gray-500">{entries.length} entries</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length > 0 ? (
                    entries.map((entry: any) => (
                      <>
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                        >
                          <TableCell className="text-sm">
                            {new Date(entry.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {entry.transactionType || "MANUAL"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[300px] truncate">
                            {entry.description || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{entry.lines?.length || 0} lines</TableCell>
                          <TableCell>
                            <Badge variant={entry.status === "POSTED" ? "success" : entry.status === "REVERSED" ? "destructive" : "warning"}>
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ArrowUpDown className="w-4 h-4 text-gray-400" />
                          </TableCell>
                        </TableRow>
                        {expandedEntry === entry.id && (
                          <TableRow key={`${entry.id}-lines`}>
                            <TableCell colSpan={6} className="bg-gray-50 p-4">
                              <div className="space-y-2">
                                {entry.reversalOfId && (
                                  <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded mb-2">
                                    Reversal of: {entry.reversalOfId.slice(0, 12)}... — Reason: {entry.reversalReason || "N/A"}
                                  </div>
                                )}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="text-left py-1 pr-4 text-gray-500 font-medium">Account</th>
                                        <th className="text-right py-1 pr-4 text-gray-500 font-medium">Debit</th>
                                        <th className="text-right py-1 pr-4 text-gray-500 font-medium">Credit</th>
                                        <th className="text-left py-1 text-gray-500 font-medium">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entry.lines?.map((line: any) => (
                                        <tr key={line.id} className="border-b border-gray-100">
                                          <td className="py-1.5 pr-4">
                                            <span className="font-mono text-xs">{line.accountCode}</span>
                                            <span className="text-gray-600 ml-2">{line.account?.name || ""}</span>
                                          </td>
                                          <td className="text-right pr-4 font-mono text-xs">
                                            {Number(line.debit) > 0 ? `$${Number(line.debit).toFixed(2)}` : "—"}
                                          </td>
                                          <td className="text-right pr-4 font-mono text-xs">
                                            {Number(line.credit) > 0 ? `$${Number(line.credit).toFixed(2)}` : "—"}
                                          </td>
                                          <td className="text-xs text-gray-500">{line.description || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="font-medium border-t border-gray-300">
                                        <td className="py-1.5 pr-4 text-xs">Totals</td>
                                        <td className="text-right pr-4 font-mono text-xs">
                                          ${entry.lines?.reduce((s: number, l: any) => s + Number(l.debit), 0).toFixed(2)}
                                        </td>
                                        <td className="text-right pr-4 font-mono text-xs">
                                          ${entry.lines?.reduce((s: number, l: any) => s + Number(l.credit), 0).toFixed(2)}
                                        </td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                                {entry.reversalOfId && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    Reference: {entry.reference || "N/A"} | Transaction: {entry.transactionId ? `${entry.transactionType}#${entry.transactionId.slice(0, 12)}` : "N/A"}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No journal entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "trial" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Trial Balance</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    As of: {trialBalance?.asOf ? new Date(trialBalance.asOf).toLocaleDateString() : "Today"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => api.get<any>("/gl/trial-balance").then(setTrialBalance)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance?.rows?.length > 0 ? (
                    trialBalance.rows.map((row: any) => (
                      <TableRow key={row.code} className={row.category === "ROOT" ? "bg-gray-50 font-medium" : ""}>
                        <TableCell className="font-mono text-xs">{row.code}</TableCell>
                        <TableCell>
                          <span className={row.category === "ROOT" ? "font-semibold" : ""}>{row.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[row.type] || ""}`}>
                            {row.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(row.totalDebit) > 0 ? `$${Number(row.totalDebit).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(row.totalCredit) > 0 ? `$${Number(row.totalCredit).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm font-medium ${
                          Number(row.balance) > 0 ? "text-emerald-600" : Number(row.balance) < 0 ? "text-red-600" : ""
                        }`}>
                          {Number(row.balance) !== 0 ? `${row.isDebitBalance ? "" : ""}$${Math.abs(Number(row.balance)).toFixed(2)}` : "$0.00"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                        <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No trial balance data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {trialBalance?.rows?.length > 0 && (
                  <tfoot>
                    <TableRow className="font-bold border-t-2 border-gray-300">
                      <TableCell colSpan={3} className="text-sm">Totals</TableCell>
                      <TableCell className="text-right font-mono">${trialBalance.totalDebit}</TableCell>
                      <TableCell className="text-right font-mono">${trialBalance.totalCredit}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Assets", value: trialBalance?.rows?.filter((r: any) => r.type === "ASSET" && r.category !== "ROOT").reduce((s: number, r: any) => s + Math.abs(Number(r.balance)), 0) || 0, color: "text-blue-600" },
              { label: "Total Liabilities", value: trialBalance?.rows?.filter((r: any) => r.type === "LIABILITY" && r.category !== "ROOT").reduce((s: number, r: any) => s + Math.abs(Number(r.balance)), 0) || 0, color: "text-amber-600" },
              { label: "Net Revenue", value: trialBalance?.rows?.filter((r: any) => r.type === "REVENUE" && r.category !== "ROOT").reduce((s: number, r: any) => s + Number(r.balance), 0) || 0, color: "text-emerald-600" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>${Number(stat.value).toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
