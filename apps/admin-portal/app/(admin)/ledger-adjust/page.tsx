"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Plus, Save } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export default function LedgerAdjustPage() {
  const [showForm, setShowForm] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"DEBIT" | "CREDIT">("CREDIT");

  const handleAdjustment = async () => {
    await adminFetch("/api/v1/admin/ledger-adjustments", {
      method: "POST",
      body: JSON.stringify({
        amount: parseFloat(adjustAmount),
        type: adjustType,
        reason: adjustReason,
        accountId: "asset-usd",
      }),
    });
    setShowForm(false);
    setAdjustAmount("");
    setAdjustReason("");
  };

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manual Ledger Adjustments</CardTitle>
            <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-500" onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-4 w-4" /> New Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead className="text-muted-foreground">ID</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Reason</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="">
                <TableCell className="font-mono text-xs">adj_001</TableCell>
                <TableCell className="font-medium">$250.00</TableCell>
                <TableCell><span className="font-medium text-emerald-400">CREDIT</span></TableCell>
                <TableCell className="text-sm text-foreground">Fee refund - goodwill</TableCell>
                <TableCell><Badge variant="warning">Pending Approval</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="">
          <CardHeader><CardTitle>New Ledger Adjustment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Amount</label>
                <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full rounded-lg border  bg-muted/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Type</label>
                <Select value={adjustType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdjustType(e.target.value as "DEBIT" | "CREDIT")}>
                  <option value="CREDIT">Credit</option>
                  <option value="DEBIT">Debit</option>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground">Reason</label>
                <textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} rows={3}
                  className="w-full rounded-lg border  bg-muted/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="border-slate-600 text-foreground" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-500" onClick={handleAdjustment} disabled={!adjustAmount || !adjustReason}>
                <Save className="mr-1 h-4 w-4" /> Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
