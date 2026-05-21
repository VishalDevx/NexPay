"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Loader2, AlertTriangle, Shield, FileText, Building, Activity } from "lucide-react";
import { api } from "@/lib/api";

const onboardingSteps = [
  { key: "business_profile", label: "Business Profile" },
  { key: "documents", label: "Documents" },
  { key: "bank_account", label: "Bank Account" },
];

const statusBadgeVariantForLifecycle = (status: string) => {
  const map: Record<string, string> = {
    APPROVED: "success",
    PENDING: "warning",
    REJECTED: "destructive",
    SUBMITTED: "info",
    REVIEW: "orange",
  };
  return map[status] || "neutral";
};

export default function LifecyclePage() {
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);
  const [businessProfile, setBusinessProfile] = useState<any>({});
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [complianceNotes, setComplianceNotes] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [onboardRes, profileRes, approvalRes, notesRes, riskRes] = await Promise.all([
          api.get<any>("/merchants/lifecycle/onboarding-status").catch(() => ({ data: {} })),
          api.get<any>("/merchants/lifecycle/business-profile").catch(() => ({ data: {} })),
          api.get<any>("/merchants/lifecycle/approval-history").catch(() => ({ data: [] })),
          api.get<any>("/merchants/lifecycle/compliance-notes").catch(() => ({ data: [] })),
          api.get<any>("/merchants/lifecycle/profile").catch(() => ({ data: {} })),
        ]);
        setOnboardingStatus(onboardRes.data || onboardRes);
        const bp = profileRes.data || profileRes;
        setBusinessProfile(bp);
        setApprovalHistory(approvalRes.data || approvalRes || []);
        setComplianceNotes(notesRes.data || notesRes || []);
        setRiskScore(riskRes.data || riskRes);
      } catch (err) {
        console.error("Failed to fetch lifecycle data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put("/merchants/lifecycle/business-profile", businessProfile);
    } catch (err) {
      console.error("Failed to save business profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const completedSteps = onboardingStatus?.completedSteps || onboardingStatus?.completed || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lifecycle & Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your onboarding, business profile, and compliance status</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Onboarding Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {onboardingSteps.map((step, i) => {
              const isCompleted = completedSteps.includes(step.key);
              const isCurrent = !isCompleted && (i === 0 || completedSteps.includes(onboardingSteps[i - 1].key));
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    isCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                    isCurrent ? "bg-blue-50 border-blue-200 text-blue-700" :
                    "bg-gray-50 border-gray-200 text-gray-400"
                  }`}>
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className={`w-4 h-4 rounded-full border-2 ${isCurrent ? "border-blue-500" : "border-gray-300"}`} />
                    )}
                    <span className="font-medium text-xs">{step.label}</span>
                  </div>
                  {i < onboardingSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-emerald-200" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">MCC Code</label>
              <Input
                value={businessProfile.mccCode || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, mccCode: e.target.value })}
                placeholder="e.g. 5734"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Monthly Volume ($)</label>
              <Input
                type="number"
                value={businessProfile.expectedMonthlyVolume || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, expectedMonthlyVolume: e.target.value })}
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Average Ticket Size ($)</label>
              <Input
                type="number"
                value={businessProfile.averageTicketSize || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, averageTicketSize: e.target.value })}
                placeholder="e.g. 99.99"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <Input
                value={businessProfile.websiteUrl || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, websiteUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Refund Policy URL</label>
              <Input
                value={businessProfile.refundPolicyUrl || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, refundPolicyUrl: e.target.value })}
                placeholder="https://example.com/refund"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Terms URL</label>
              <Input
                value={businessProfile.termsUrl || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, termsUrl: e.target.value })}
                placeholder="https://example.com/terms"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium mb-1">Business Description</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                rows={3}
                value={businessProfile.businessDescription || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, businessDescription: e.target.value })}
                placeholder="Describe your business..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax ID</label>
              <Input
                value={businessProfile.taxId || ""}
                onChange={(e) => setBusinessProfile({ ...businessProfile, taxId: e.target.value })}
                placeholder="e.g. 12-3456789"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</> : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Approval History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalHistory.length > 0 ? (
                  approvalHistory.map((a: any, i: number) => (
                    <TableRow key={a.id || i}>
                      <TableCell>
                        <Badge variant={statusBadgeVariantForLifecycle(a.action) as any}>{a.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.fromStatus || "—"}</TableCell>
                      <TableCell className="text-sm">{a.toStatus || "—"}</TableCell>
                      <TableCell className="text-sm">{a.reviewer || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">{a.reason || "—"}</TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No approval history yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Risk Score</CardTitle></CardHeader>
            <CardContent>
              <div className={`rounded-xl border p-4 text-center ${riskScore?.score != null ? getRiskColor(Number(riskScore.score)) : "bg-gray-50 border-gray-200"}`}>
                <Shield className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{riskScore?.score != null ? `${riskScore.score}` : "—"}</p>
                <p className="text-sm mt-1">
                  {riskScore?.score != null
                    ? Number(riskScore.score) >= 70 ? "High Risk"
                      : Number(riskScore.score) >= 40 ? "Medium Risk"
                      : "Low Risk"
                    : "Not available"}
                </p>
              </div>
              {riskScore?.factors && riskScore.factors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Factors</p>
                  {riskScore.factors.map((f: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{f.name}</span>
                      <span className="font-medium">{f.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Compliance Notes</CardTitle></CardHeader>
            <CardContent>
              {complianceNotes.length > 0 ? (
                <div className="space-y-3">
                  {complianceNotes.map((n: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">{n.author || "Internal"}</span>
                        <span className="text-xs text-gray-400">
                          {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-sm">{n.note || n.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No compliance notes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
