"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Building2, FileText, Landmark, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const steps = [
  { key: "business_profile", label: "Business Profile", icon: Building2, href: "/onboarding/business-profile" },
  { key: "documents", label: "KYC Documents", icon: FileText, href: "/onboarding/documents" },
  { key: "bank_account", label: "Bank Account", icon: Landmark, href: "/onboarding/bank-account" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    if (!token) { router.push("/login"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setMerchant(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const kycStatus = merchant?.kycStatus || "NOT_SUBMITTED";
  const currentStepIdx = kycStatus === "NOT_SUBMITTED" ? 0 : kycStatus === "PENDING" ? 1 : 2;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isComplete = kycStatus === "VERIFIED";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Complete your onboarding</h1>
        <p className="text-gray-500 mt-1">Set up your account to start accepting payments</p>
      </div>

      {isComplete && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">KYC verified</h3>
              <p className="text-sm text-emerald-700">Your account is fully onboarded. You can now accept payments.</p>
            </div>
            <Link href="/dashboard" className="ml-auto">
              <Button className="bg-emerald-600 hover:bg-emerald-500">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentStepIdx || isComplete;
          const current = i === currentStepIdx && !isComplete;

          return (
            <Link key={step.key} href={done || current ? step.href : "#"}>
              <Card
                className={`transition-all hover:shadow-md ${
                  done
                    ? "border-emerald-200 bg-emerald-50/50"
                    : current
                    ? "border-blue-200 bg-blue-50/50"
                    : "opacity-60"
                }`}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      done
                        ? "bg-emerald-100 text-emerald-600"
                        : current
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{step.label}</h3>
                      {done && <Badge variant="success">Completed</Badge>}
                      {current && <Badge variant="warning">In progress</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{stepDescriptions[step.key]}</p>
                  </div>
                  {(done || current) && <ArrowRight className="w-5 h-5 text-gray-400" />}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KYC Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"].map((status, i) => {
                const statusIdx = ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"].indexOf(kycStatus);
                const active = i <= statusIdx;
                const isRejected = kycStatus === "REJECTED" && status === "REJECTED";
                return (
                  <div key={status} className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isRejected
                          ? "bg-red-500"
                          : active
                          ? "bg-blue-500"
                          : "bg-gray-200"
                      }`}
                    />
                    <span className={`text-xs ${isRejected ? "text-red-600 font-medium" : active ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                      {status.replace(/_/g, " ")}
                    </span>
                    {i < 3 && <div className={`flex-1 h-px ${active && !isRejected ? "bg-blue-300" : "bg-gray-200"}`} />}
                  </div>
                );
              })}
            </div>
          </div>
          {kycStatus === "REJECTED" && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">KYC was rejected</p>
              <p className="text-xs text-red-600 mt-1">Please contact support for details on why your KYC was rejected.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const stepDescriptions: Record<string, string> = {
  business_profile: "Legal name, registration number, address, and business category",
  documents: "Upload PAN/GST, Director ID, and bank statements",
  bank_account: "Link your bank account for settlement payouts",
};
