"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Calendar, Banknote, Download, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { api } from "@/lib/api";

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "monthly">("daily");
  const [minThreshold, setMinThreshold] = useState("100");
  const [selectedBank, setSelectedBank] = useState("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [settlementItems, setSettlementItems] = useState<any[]>([]);
  const [payouting, setPayouting] = useState(false);
  const initialLoad = useRef(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [payoutsRes, bankRes, settingsRes] = await Promise.all([
          api.get<any>("/payouts"),
          api.get<any>("/bank-accounts"),
          api.get<any>("/settings").catch(() => null),
        ]);
        const payoutsData = payoutsRes.data || [];
        setPayouts(payoutsData);
        setAvailableBalance(payoutsRes.availableBalance || 0);

        const accounts = bankRes.data || [];
        setBankAccounts(accounts);
        if (accounts.length > 0) setSelectedBank(accounts[0].id || accounts[0].label || accounts[0].accountNumber);

        const settings = settingsRes?.data?.settingsJson;
        if (settings?.payoutSchedule) {
          setSchedule(settings.payoutSchedule.frequency || "daily");
          setMinThreshold(String(settings.payoutSchedule.minThreshold ?? "100"));
        }
      } catch (err) {
        console.error("Payouts fetch error:", err);
      } finally {
        setLoading(false);
        initialLoad.current = false;
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (initialLoad.current) return;
    const timeout = setTimeout(async () => {
      try {
        await api.put("/settings/settings", {
          payoutSchedule: { frequency: schedule, minThreshold: Number(minThreshold) },
        });
      } catch (err) {
        console.error("Save schedule error:", err);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [schedule, minThreshold]);

  const handleManualPayout = async () => {
    setPayouting(true);
    try {
      await api.post("/payouts", {
        amount: availableBalance,
        bankAccountId: selectedBank,
        scheduledFor: new Date().toISOString(),
      });
      const res = await api.get<any>("/payouts");
      setPayouts(res.data || []);
      setAvailableBalance(res.availableBalance || 0);
    } catch (err) {
      console.error("Manual payout error:", err);
    } finally {
      setPayouting(false);
    }
  };

  const toggleSettlement = (payout: any) => {
    if (selectedPayout?.id === payout.id && showSettlement) {
      setShowSettlement(false);
      setSelectedPayout(null);
      setSettlementItems([]);
    } else {
      setSelectedPayout(payout);
      setSettlementItems(payout.items || []);
      setShowSettlement(true);
    }
  };

  const bankLabel = (acc: any) =>
    acc.label || `${acc.bankName || ""} ****${(acc.accountNumber || "").slice(-4) || acc.last4 || ""}`.trim();

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
                {bankAccounts.length > 0 ? (
                  bankAccounts.map((acc: any) => (
                    <option key={acc.id || acc.accountNumber} value={acc.id || acc.accountNumber}>
                      {bankLabel(acc)}
                    </option>
                  ))
                ) : (
                  <option value="">No bank accounts found</option>
                )}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="w-4 h-4" />
              Available for payout: <span className="font-semibold text-gray-900">${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-500 text-white"
              disabled={payouting || availableBalance <= 0}
              onClick={handleManualPayout}
            >
              <Zap className="w-4 h-4 mr-1" /> {payouting ? "Processing..." : "Pay Now"}
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
                    <TableCell className="font-mono text-xs">{p.reference || p.id?.slice(0, 12)}</TableCell>
                    <TableCell className="font-medium">${Number(p.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs text-gray-500">{p.bankRef || "\u2014"}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(p.status) as any}>{p.status}</Badge></TableCell>
                    <TableCell className="text-gray-500 text-sm">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => toggleSettlement(p)}>
                        {showSettlement && selectedPayout?.id === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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

      {showSettlement && selectedPayout && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm">Settlement Breakdown — {selectedPayout.reference || selectedPayout.id?.slice(0, 12)}</CardTitle>
          </CardHeader>
          <CardContent>
            {settlementItems.length > 0 ? (
              <>
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
                    {settlementItems.map((item: any, i: number) => (
                      <TableRow key={item.txnId || i}>
                        <TableCell className="font-mono text-xs">{item.txnId}</TableCell>
                        <TableCell>${Number(item.gross).toFixed(2)}</TableCell>
                        <TableCell className="text-red-500">-${Number(item.fee).toFixed(2)}</TableCell>
                        <TableCell className="text-amber-500">{Number(item.disputeReserve || item.reserve || 0) > 0 ? `-$${Number(item.disputeReserve || item.reserve || 0).toFixed(2)}` : "\u2014"}</TableCell>
                        <TableCell className="font-medium text-emerald-600">${Number(item.net).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Gross: <span className="font-medium text-gray-900">${settlementItems.reduce((s: number, i: any) => s + Number(i.gross), 0).toFixed(2)}</span></p>
                    <p className="text-sm text-gray-500">Total Fees: <span className="font-medium text-red-500">-${settlementItems.reduce((s: number, i: any) => s + Number(i.fee), 0).toFixed(2)}</span></p>
                    <p className="text-sm text-gray-500">Total Reserve: <span className="font-medium text-amber-500">-${settlementItems.reduce((s: number, i: any) => s + Number(i.disputeReserve || i.reserve || 0), 0).toFixed(2)}</span></p>
                    <p className="text-lg font-bold text-emerald-600">Net Payout: ${settlementItems.reduce((s: number, i: any) => s + Number(i.net), 0).toFixed(2)}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No settlement details available</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
