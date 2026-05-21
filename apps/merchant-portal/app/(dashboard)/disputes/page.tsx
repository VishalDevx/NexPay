"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Check, AlertTriangle, Clock, X, FileText, ShieldAlert } from "lucide-react";

const mockDisputes = [
  { id: "dsp_001", paymentId: "pay_abc123", reason: "service_not_received", amount: 199.00, currency: "USD", status: "RAISED", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), deadline: 7 },
  { id: "dsp_002", paymentId: "pay_def456", reason: "duplicate", amount: 89.50, currency: "USD", status: "EVIDENCE_SUBMITTED", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), deadline: 4 },
  { id: "dsp_003", paymentId: "pay_ghi789", reason: "product_unacceptable", amount: 450.00, currency: "USD", status: "UNDER_REVIEW", createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), deadline: 2 },
  { id: "dsp_004", paymentId: "pay_jkl012", reason: "credit_not_processed", amount: 1200.00, currency: "USD", status: "RESOLVED_MERCHANT_WON", createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), deadline: 0 },
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/disputes`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => { setDisputes(data.data?.length ? data.data : mockDisputes); setLoading(false); })
      .catch(() => { setDisputes(mockDisputes); setLoading(false); });
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const files = Array.from(e.dataTransfer.files);
    setEvidenceFiles((prev) => [...prev, ...files].slice(0, 5));
  };

  const submitEvidence = async () => {
    const token = localStorage.getItem("nexpay_token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/disputes/${selectedDispute.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": token || "" },
      body: JSON.stringify({ files: evidenceFiles.map((f) => f.name) }),
    });
    setDisputes(disputes.map((d) => d.id === selectedDispute.id ? { ...d, status: "EVIDENCE_SUBMITTED" } : d));
    setShowEvidence(false);
    setEvidenceFiles([]);
  };

  const getUrgencyBadge = (daysLeft: number) => {
    if (daysLeft <= 2) return <Badge variant="destructive">{daysLeft}d left</Badge>;
    if (daysLeft <= 5) return <Badge variant="warning">{daysLeft}d left</Badge>;
    return <Badge variant="neutral">{daysLeft}d left</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Disputes & Chargebacks</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and respond to customer disputes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispute History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>))}</TableRow>
                ))
              ) : disputes.length > 0 ? (
                disputes.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.paymentId?.slice(0, 12)}...</TableCell>
                    <TableCell className="text-sm capitalize">{d.reason?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="font-medium">${Number(d.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(d.status) as any}>{d.status?.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{getUrgencyBadge(d.deadline || 0)}</TableCell>
                    <TableCell>
                      {d.status === "RAISED" && (
                        <Button variant="outline" size="sm" onClick={() => { setSelectedDispute(d); setShowEvidence(true); }}>
                          <Upload className="w-3 h-3 mr-1" /> Submit Evidence
                        </Button>
                      )}
                      {d.status === "RESOLVED_MERCHANT_WON" && <Badge variant="success">Won</Badge>}
                      {d.status === "RESOLVED_MERCHANT_LOST" && <Badge variant="destructive">Lost</Badge>}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">No disputes found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4" /> Open Disputes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{disputes.filter((d) => d.status === "RAISED" || d.status === "EVIDENCE_SUBMITTED" || d.status === "UNDER_REVIEW").length}</p>
            <p className="text-sm text-gray-500 mt-1">Requiring action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="w-4 h-4" /> Amount at Risk</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              ${disputes.filter((d) => d.status !== "RESOLVED_MERCHANT_WON" && d.status !== "RESOLVED_MERCHANT_LOST").reduce((s: number, d: any) => s + Number(d.amount), 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Frozen in wallet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Check className="w-4 h-4" /> Win Rate</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {(() => {
                const resolved = disputes.filter((d) => d.status === "RESOLVED_MERCHANT_WON" || d.status === "RESOLVED_MERCHANT_LOST");
                if (!resolved.length) return "—";
                return `${((resolved.filter((d) => d.status === "RESOLVED_MERCHANT_WON").length / resolved.length) * 100).toFixed(0)}%`;
              })()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Resolution rate</p>
          </CardContent>
        </Card>
      </div>

      {showEvidence && selectedDispute && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowEvidence(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Submit Evidence</h3>
              <button onClick={() => setShowEvidence(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Deadline: {selectedDispute.deadline} days remaining</p>
                <p className="text-xs text-amber-600">Submit evidence before the deadline to avoid auto-loss</p>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                dragover ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium">Drag & drop evidence files here</p>
              <p className="text-xs text-gray-500 mt-1">Invoices, delivery proofs, screenshots, contracts (PDF, JPG, PNG. Max 10MB each)</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setEvidenceFiles((prev) => [...prev, ...files].slice(0, 5));
                }}
              />
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
                Browse Files
              </Button>
            </div>

            {evidenceFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {evidenceFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setEvidenceFiles(evidenceFiles.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowEvidence(false)}>Cancel</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white" disabled={evidenceFiles.length === 0} onClick={submitEvidence}>
                Submit Evidence
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
