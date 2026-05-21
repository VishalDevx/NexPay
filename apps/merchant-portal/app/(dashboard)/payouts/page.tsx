"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Calendar, Banknote, Download, ChevronDown, ChevronUp, Zap } from "lucide-react";

const mockPayouts = [
  { id: "po_001", reference: "PO-2024-001", totalAmount: 12430.50, currency: "USD", status: "COMPLETED", bankRef: "NEFT123456789", completedAt: new Date(Date.now() - 1 * 86400000).toISOString(), createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "po_002", reference: "PO-2024-002", totalAmount: 8420.00, currency: "USD", status: "PROCESSING", createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: "po_003", reference: "PO-2024-003", totalAmount: 5600.75, currency: "USD", status: "FAILED", bankRef: "ACH_FAILED", completedAt: new Date(Date.now() - 3 * 86400000).toISOString(), createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];

const mockSettlementItems = [
  { txnId: "pay_001", gross: 249.99, fee: 7.50, disputeReserve: 0, net: 242.49 },
  { txnId: "pay_002", gross: 1500.00, fee: 37.50, disputeReserve: 0, net: 1462.50 },
  { txnId: "pay_003", gross: 89.50, fee: 2.68, disputeReserve: 0, net: 86.82 },
  { txnId: "pay_004", gross: 420.00, fee: 12.60, disputeReserve: 199.00, net: 208.40 },
];

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "monthly">("daily");
  const [minThreshold, setMinThreshold] = useState("100");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank ****1234");
  const [showSettlement, setShowSettlement] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payouts`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => { setPayouts(data.data?.length ? data.data : mockPayouts); setLoading(false); })
      .catch(() => { setPayouts(mockPayouts); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts & Settlement</h1>
        <p className="text-sm text-gray-500 mt-1">Manage settlement schedules and payout history</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Payout Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
                {(["daily", "weekly", "monthly"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSchedule(f)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                      schedule === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Min. Payout Threshold</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank Account</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option>HDFC Bank ****1234 (Primary)</option>
                <option>ICICI Bank ****5678</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="w-4 h-4" />
              Available for payout: <span className="font-semibold text-gray-900">$12,430.50</span>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">
              <Zap className="w-4 h-4 mr-1" /> Pay Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Settlement History</CardTitle>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export PDF</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank Ref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>))}</TableRow>
                ))
              ) : payouts.length > 0 ? (
                payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                    <TableCell className="font-medium">${Number(p.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs text-gray-500">{p.bankRef || "—"}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(p.status) as any}>{p.status}</Badge></TableCell>
                    <TableCell className="text-gray-500 text-sm">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setShowSettlement(!showSettlement)}>
                        {showSettlement ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">No payouts yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showSettlement && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm">Settlement Breakdown — PO-2024-001</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Reserve</TableHead>
                  <TableHead>Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockSettlementItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{item.txnId}</TableCell>
                    <TableCell>${item.gross.toFixed(2)}</TableCell>
                    <TableCell className="text-red-500">-${item.fee.toFixed(2)}</TableCell>
                    <TableCell className="text-amber-500">{item.disputeReserve > 0 ? `-$${item.disputeReserve.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="font-medium text-emerald-600">${item.net.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Gross: <span className="font-medium text-gray-900">$2,259.49</span></p>
                <p className="text-sm text-gray-500">Total Fees: <span className="font-medium text-red-500">-$60.28</span></p>
                <p className="text-sm text-gray-500">Total Reserve: <span className="font-medium text-amber-500">-$199.00</span></p>
                <p className="text-lg font-bold text-emerald-600">Net Payout: $2,000.21</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
