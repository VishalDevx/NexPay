"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { key: "business_profile", label: "Business" },
  { key: "documents", label: "Documents" },
  { key: "bank_account", label: "Bank" },
  { key: "verified", label: "Verified" },
];

interface OnboardingProgressProps {
  kycStatus: string;
  className?: string;
}

export function OnboardingProgress({ kycStatus, className }: OnboardingProgressProps) {
  const statusOrder = ["NOT_SUBMITTED", "PENDING", "VERIFIED"];
  const currentIdx =
    kycStatus === "REJECTED"
      ? 1
      : kycStatus === "VERIFIED"
        ? 3
        : kycStatus === "PENDING"
          ? 2
          : kycStatus === "NOT_SUBMITTED"
            ? 0
            : 1;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {STEPS.map((step, i) => {
        const done = i < currentIdx || kycStatus === "VERIFIED";
        const current = i === currentIdx && kycStatus !== "VERIFIED";
        const rejected = kycStatus === "REJECTED" && i === 1;

        return (
          <div key={step.key} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  done && "bg-emerald-100 text-emerald-700",
                  current && !rejected && "bg-primary/10 text-primary ring-2 ring-primary/30",
                  rejected && "bg-red-100 text-red-700",
                  !done && !current && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  done && "text-emerald-700",
                  current && "text-primary",
                  !done && !current && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 -mt-4",
                  done ? "bg-emerald-300" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
