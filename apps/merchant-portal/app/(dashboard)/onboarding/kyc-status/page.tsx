"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusSteps = [
  { key: "not_started", label: "Business Profile", step: 0 },
  { key: "documents_uploaded", label: "KYC Documents", step: 1 },
  { key: "bank_linked", label: "Bank Account", step: 2 },
  { key: "pending_review", label: "Under Review", step: 3 },
  { key: "approved", label: "Approved", step: 4 },
];

const statusIcons: Record<string, { icon: any; color: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-500" },
  active: { icon: Clock, color: "text-blue-500" },
  pending: { icon: AlertCircle, color: "text-gray-300" },
  rejected: { icon: XCircle, color: "text-red-500" },
};

export default function KYCStatusPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>("/merchants/profile")
      .then(r => setProfile(r.data || r))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kycStatus = profile?.kycStatus || "not_started";

  const getStepStatus = (stepIndex: number) => {
    const statusIndex = statusSteps.find(s => s.key === kycStatus)?.step ?? 0;
    if (stepIndex < statusIndex) return "completed";
    if (stepIndex === statusIndex) return "active";
    return "pending";
  };

  const steps = statusSteps.map((s) => ({
    ...s,
    status: getStepStatus(s.step),
  }));

  const isRejected = kycStatus === "rejected";
  const isApproved = kycStatus === "approved";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/onboarding" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="w-4 h-4" /> Back to onboarding
      </Link>

      <div>
        <h1 className="text-2xl font-bold">KYC Status</h1>
        <p className="text-gray-500 mt-1">Track your verification progress</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Verification Progress</CardTitle>
            {isApproved && <Badge variant="success">Approved</Badge>}
            {isRejected && <Badge variant="destructive">Rejected</Badge>}
            {!isApproved && !isRejected && <Badge variant="warning">In Progress</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : isRejected ? (
            <div className="text-center py-6">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">Verification Rejected</h3>
              <p className="text-sm text-gray-500 mb-4">{profile?.kycMessage || "Your KYC documents were rejected. Please re-submit corrected documents."}</p>
              <Link href="/onboarding/documents">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                  Re-submit Documents <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-0">
              {steps.map((step, idx) => {
                const { icon: Icon, color } = statusIcons[step.status] || statusIcons.pending;
                return (
                  <div key={step.key} className="flex items-start gap-4 pb-6 relative">
                    {idx < steps.length - 1 && (
                      <div className={`absolute left-5 top-10 w-0.5 h-8 ${
                        step.status === "completed" ? "bg-emerald-300" : "bg-gray-200"
                      }`} />
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === "completed" ? "bg-emerald-50" :
                      step.status === "active" ? "bg-blue-50" : "bg-gray-50"
                    }`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="pt-1.5">
                      <p className={`font-medium text-sm ${
                        step.status === "completed" ? "text-emerald-700" :
                        step.status === "active" ? "text-blue-700" : "text-gray-400"
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {step.status === "completed" ? "Completed" :
                         step.status === "active" ? "In progress" : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
