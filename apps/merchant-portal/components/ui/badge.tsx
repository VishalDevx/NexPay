import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
        warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
        info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
        neutral: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
        purple: "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
        orange: "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};

const statusBadgeVariant = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: "success",
    INACTIVE: "neutral",
    SUSPENDED: "destructive",
    VERIFIED: "success",
    UNVERIFIED: "warning",
    PENDING: "warning",
    INITIATED: "neutral",
    PROCESSING: "warning",
    AUTHORIZED: "info",
    CAPTURED: "success",
    SETTLED: "success",
    FAILED: "destructive",
    REFUNDED: "purple",
    DISPUTED: "orange",
    APPROVE: "success",
    REVIEW: "warning",
    DECLINE: "destructive",
    OPEN: "warning",
    UNDER_REVIEW: "info",
    RESOLVED: "success",
    MERCHANT_WON: "success",
    MERCHANT_LOST: "destructive",
  };
  return map[status] || "neutral";
};

export { Badge, badgeVariants, statusBadgeVariant };
