"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Building2, FileText, Landmark, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";
import type { Merchant } from "@/lib/auth-context";

const steps = [
  { key: "business_profile", label: "Business profile", icon: Building2, href: "/onboarding/business-profile" },
  { key: "documents", label: "Documents", icon: FileText, href: "/onboarding/documents" },
  { key: "bank_account", label: "Bank account", icon: Landmark, href: "/onboarding/bank-account" },
];

const stepDescriptions: Record<string, string> = {
  business_profile: "Legal name, address, and business category",
  documents: "Upload identity and business verification documents",
  bank_account: "Link your bank account for payouts",
};

export default function OnboardingPage() {
  const { merchant: authMerchant, refresh } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(authMerchant);
  const [loading, setLoading] = useState(!authMerchant);

  useEffect(() => {
    api.get<Merchant>("/merchants/profile")
      .then((data) => { setMerchant(data); refresh(); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const kycStatus = merchant?.kycStatus || authMerchant?.kycStatus || "NOT_SUBMITTED";
  const currentStepIdx = kycStatus === "NOT_SUBMITTED" ? 0 : kycStatus === "PENDING" ? 1 : 2;
  const isComplete = kycStatus === "VERIFIED";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Onboarding" description="Complete setup to start accepting payments" />
      <OnboardingProgress kycStatus={kycStatus} className="mb-8" />

      {isComplete && (
        <Card className="mb-6 border-emerald-200/80 bg-emerald-50/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">You&apos;re all set</p>
              <p className="text-[13px] text-muted-foreground">KYC verified — start accepting payments.</p>
            </div>
            <Button size="sm" asChild><Link href="/dashboard">Dashboard</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentStepIdx || isComplete;
          const current = i === currentStepIdx && !isComplete;

          return (
            <Link key={step.key} href={done || current ? step.href : "#"}>
              <Card className={`transition-colors hover:border-foreground/20 ${!done && !current ? "opacity-50" : ""}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${done ? "bg-emerald-100 text-emerald-700" : current ? "bg-muted" : "bg-muted/50 text-muted-foreground"}`}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{step.label}</p>
                      {done && <Badge variant="success" className="text-[10px]">Done</Badge>}
                      {current && <Badge variant="warning" className="text-[10px]">Current</Badge>}
                    </div>
                    <p className="text-[12px] text-muted-foreground">{stepDescriptions[step.key]}</p>
                  </div>
                  {(done || current) && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {kycStatus === "REJECTED" && (
        <Card className="mt-6 border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2"><CardTitle className="text-destructive text-sm">KYC rejected</CardTitle></CardHeader>
          <CardContent className="text-[13px] text-muted-foreground">Contact support for next steps.</CardContent>
        </Card>
      )}
    </div>
  );
}
