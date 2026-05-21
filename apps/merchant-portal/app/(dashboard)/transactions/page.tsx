"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Download, Filter, X, ChevronDown, ChevronUp,
  AlertTriangle, RefreshCw, FileText, Eye,
} from "lucide-react";

const statuses = ["ALL", "INITIATED", "PROCESSING", "AUTHORIZED", "CAPTURED", "SETTLED", "FAILED", "REFUNDED", "DISPUTED"];
const currencies = ["ALL", "USD", "INR", "EUR", "GBP"];

export default function TransactionsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [showRefundModal, setShowRefundModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/charges`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => { setPayments(data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = payments.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (currencyFilter !== "ALL" && p.currency !== currencyFilter) return false;
    if (search && !p.id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleRefund = async () => {
    const token = localStorage.getItem("nexpay_token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/charges/${selectedPayment.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": token || "" },
      body: JSON.stringify({ amount: parseFloat(refundAmount), reason: refundReason }),
    });
    setShowRefundModal(false);
    setRefundAmount("");
    setRefundReason("");
  };

  const exportData = (format: "csv" | "xlsx") => {
    const headers = ["ID", "Amount", "Currency", "Status", "Customer", "Fraud Score", "Date"];
    const rows = filtered.map((p) => [
      p.id, p.amount, p.currency, p.status, p.customer?.email || "—", p.fraudScore || "—",
      new Date(p.createdAt).toISOString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFraudColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-50";
    if (score >= 50) return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  };

  const stateMachineSteps = [
    "INITIATED", "PROCESSING", "AUTHORIZED", "CAPTURED", "SETTLED",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">View, filter, and manage all payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData("xlsx")}>
            <FileText className="w-4 h-4 mr-1" /> XLSX
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by payment ID, customer email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="ALL">All Status</option>
              {statuses.filter((s) => s !== "ALL").map((s) => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </Select>
            <Select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} className="w-32">
              {currencies.map((c) => (<option key={c} value={c}>{c === "ALL" ? "All Currencies" : c}</option>))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fraud Score</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => { setSelectedPayment(p); setShowDrawer(true); }}>
                    <TableCell className="font-mono text-xs">{p.id?.slice(0, 12)}...</TableCell>
                    <TableCell className="font-medium">{Number(p.amount).toLocaleString("en-US", { style: "currency", currency: p.currency || "USD" })}</TableCell>
                    <TableCell>{p.currency || "USD"}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(p.status) as any}>{p.status}</Badge></TableCell>
                    <TableCell>
                      {p.fraudScore != null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getFraudColor(Number(p.fraudScore))}`}>
                          {Number(p.fraudScore).toFixed(0)}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{p.customer?.email || "—"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPayment(p); setShowDrawer(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">No transactions found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showDrawer && selectedPayment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Transaction Detail</h2>
                <button onClick={() => setShowDrawer(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">State Machine</p>
                  <div className="flex items-center gap-1">
                    {stateMachineSteps.map((step, i) => {
                      const currentIdx = stateMachineSteps.indexOf(selectedPayment.status);
                      const isActive = i <= currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <div key={step} className="flex items-center flex-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-blue-500" : "bg-gray-200"}`} />
                          {i < stateMachineSteps.length - 1 && (
                            <div className={`flex-1 h-0.5 ${isActive && !isCurrent ? "bg-blue-300" : "bg-gray-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    {stateMachineSteps.map((s) => (
                      <span key={s} className={selectedPayment.status === s ? "text-blue-600 font-medium" : ""}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Payment ID", value: selectedPayment.id },
                    { label: "Amount", value: `$${Number(selectedPayment.amount).toFixed(2)}` },
                    { label: "Currency", value: selectedPayment.currency || "USD" },
                    { label: "Status", value: selectedPayment.status },
                    { label: "Fraud Score", value: selectedPayment.fraudScore ? `${Number(selectedPayment.fraudScore).toFixed(0)}/100` : "—" },
                    { label: "Description", value: selectedPayment.description || "—" },
                    { label: "Created", value: new Date(selectedPayment.createdAt).toLocaleString() },
                    { label: "Captured", value: selectedPayment.capturedAt ? new Date(selectedPayment.capturedAt).toLocaleString() : "—" },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-xs text-gray-500">{f.label}</p>
                      <p className="text-sm font-medium break-all">{f.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Ledger Entries</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-emerald-600 font-medium">+ Credit</span><span>$249.00</span></div>
                    <div className="flex justify-between text-sm"><span className="text-red-600 font-medium">- Debit</span><span>$249.00</span></div>
                  </div>
                </div>

                {selectedPayment.fraudEvents && selectedPayment.fraudEvents.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Fraud Breakdown</p>
                    <div className="space-y-2">
                      {selectedPayment.fraudEvents.map((fe: any, i: number) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
                          <span>{fe.ruleName || "Unknown rule"}</span>
                          <span className="font-medium">{Number(fe.score).toFixed(0)} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {(selectedPayment.status === "CAPTURED" || selectedPayment.status === "SETTLED") && (
                    <Button
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                      onClick={() => setShowRefundModal(true)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Refund
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1">
                    <FileText className="w-4 h-4 mr-1" /> View in Ledger
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showRefundModal && selectedPayment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRefundModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-50">
            <h3 className="text-lg font-bold mb-4">Initiate Refund</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">${Number(selectedPayment.amount).toFixed(2)} available for refund</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Refund amount</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="0.00"
                  max={Number(selectedPayment.amount)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select reason</option>
                  <option value="customer_request">Customer request</option>
                  <option value="duplicate">Duplicate charge</option>
                  <option value="fraudulent">Fraudulent transaction</option>
                  <option value="product_unavailable">Product unavailable</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRefundModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-amber-600 hover:bg-amber-500 text-white" onClick={handleRefund} disabled={!refundAmount}>
                  Issue Refund
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
