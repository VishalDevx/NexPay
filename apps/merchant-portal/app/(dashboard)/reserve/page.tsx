"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Lock, Unlock, Edit3, X, Loader2, DollarSign, Clock } from "lucide-react";
import { api } from "@/lib/api";

const releaseStatusVariant = (status: string) => {
  const map: Record<string, string> = {
    SCHEDULED: "info",
    RELEASED: "success",
    PENDING: "warning",
    CANCELLED: "neutral",
  };
  return map[status] || "neutral";
};

export default function ReservePage() {
  const [config, setConfig] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editReservePct, setEditReservePct] = useState("");
  const [editFixedAmount, setEditFixedAmount] = useState("");
  const [editReleaseDelay, setEditReleaseDelay] = useState("");
  const [saving, setSaving] = useState(false);

  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdAmount, setHoldAmount] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [holding, setHolding] = useState(false);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, scheduleRes] = await Promise.all([
        api.get<any>("/reserve/config").catch(() => ({ data: null })),
        api.get<any>("/reserve/release").catch(() => ({ data: [] })),
      ]);
      const c = configRes.data || configRes;
      setConfig(c);
      if (c) {
        setEditReservePct(String(c.reservePercentage ?? ""));
        setEditFixedAmount(String(c.fixedReserveAmount ?? ""));
        setEditReleaseDelay(String(c.releaseDelay ?? ""));
      }
      setSchedule(scheduleRes.data || scheduleRes || []);
    } catch (err) {
      console.error("Failed to fetch reserve data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const body = {
        reservePercentage: parseFloat(editReservePct),
        fixedReserveAmount: parseFloat(editFixedAmount),
        releaseDelay: parseInt(editReleaseDelay, 10),
      };
      const res = await api.put<any>("/reserve/config", body);
      setConfig(res.data || res);
      setEditing(false);
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleManualHold = async () => {
    if (!holdAmount || !holdReason.trim()) return;
    setHolding(true);
    try {
      await api.post("/reserve/hold", { amount: parseFloat(holdAmount), reason: holdReason });
      setShowHoldModal(false);
      setHoldAmount("");
      setHoldReason("");
      fetchData();
    } catch (err) {
      console.error("Failed to place hold:", err);
    } finally {
      setHolding(false);
    }
  };

  const handleReleaseRequest = async () => {
    if (!releaseAmount) return;
    setReleasing(true);
    try {
      await api.post("/reserve/release", { amount: parseFloat(releaseAmount) });
      setShowReleaseModal(false);
      setReleaseAmount("");
      fetchData();
    } catch (err) {
      console.error("Failed to request release:", err);
    } finally {
      setReleasing(false);
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
      <div>
        <h1 className="text-2xl font-bold">Reserve Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage reserve configuration, holds, and releases</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reserve Configuration</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            <Edit3 className="w-4 h-4 mr-1" /> {editing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Reserve Percentage (%)</label>
                  <Input type="number" value={editReservePct} onChange={(e) => setEditReservePct(e.target.value)} step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fixed Reserve Amount ($)</label>
                  <Input type="number" value={editFixedAmount} onChange={(e) => setEditFixedAmount(e.target.value)} step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Release Delay (days)</label>
                  <Input type="number" value={editReleaseDelay} onChange={(e) => setEditReleaseDelay(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveConfig} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</> : "Save Configuration"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Reserve Percentage", value: config?.reservePercentage != null ? `${config.reservePercentage}%` : "—", icon: PercentDisplay },
                { label: "Fixed Reserve Amount", value: config?.fixedReserveAmount != null ? `$${Number(config.fixedReserveAmount).toFixed(2)}` : "—", icon: DollarSign },
                { label: "Current Reserve Balance", value: config?.currentReserveBalance != null ? `$${Number(config.currentReserveBalance).toFixed(2)}` : "—", icon: Shield },
                { label: "Release Delay", value: config?.releaseDelay != null ? `${config.releaseDelay} days` : "—", icon: Clock },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-4 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{item.label}</span>
                    </div>
                    <p className="text-lg font-bold">{item.value}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowHoldModal(true)}>
          <Lock className="w-4 h-4 mr-1" /> Manual Hold
        </Button>
        <Button variant="outline" onClick={() => setShowReleaseModal(true)}>
          <Unlock className="w-4 h-4 mr-1" /> Request Release
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Release Schedule</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Released Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.length > 0 ? (
                schedule.map((s: any, i: number) => (
                  <TableRow key={s.id || i}>
                    <TableCell className="font-medium">${Number(s.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={releaseStatusVariant(s.status) as any}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {s.releasedDate ? new Date(s.releasedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                    <Unlock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No release schedule entries
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showHoldModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowHoldModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Manual Hold</h3>
              <button onClick={() => setShowHoldModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount ($)</label>
                <Input type="number" value={holdAmount} onChange={(e) => setHoldAmount(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  rows={3}
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Why is this hold being placed?"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowHoldModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-amber-600 hover:bg-amber-500 text-white" onClick={handleManualHold} disabled={!holdAmount || !holdReason.trim() || holding}>
                  {holding ? "Placing Hold..." : "Place Hold"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {showReleaseModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowReleaseModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Request Release</h3>
              <button onClick={() => setShowReleaseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount to Release ($)</label>
                <Input type="number" value={releaseAmount} onChange={(e) => setReleaseAmount(e.target.value)} placeholder="0.00" step="0.01" />
                {config?.currentReserveBalance != null && (
                  <p className="text-xs text-gray-500 mt-1">Available balance: ${Number(config.currentReserveBalance).toFixed(2)}</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white" onClick={handleReleaseRequest} disabled={!releaseAmount || releasing}>
                  {releasing ? "Requesting..." : "Request Release"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PercentDisplay(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}
