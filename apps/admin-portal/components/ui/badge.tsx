import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "neutral" | "purple" | "orange";
}

const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  const variants = {
    default: "bg-primary text-primary-foreground",
    success: "bg-emerald-900/50 text-emerald-300 border-emerald-800",
    warning: "bg-amber-900/50 text-amber-300 border-amber-800",
    destructive: "bg-destructive text-destructive-foreground",
    info: "bg-blue-900/50 text-blue-300 border-blue-800",
    neutral: "bg-gray-800 text-gray-300",
    purple: "bg-purple-900/50 text-purple-300 border-purple-800",
    orange: "bg-orange-900/50 text-orange-300 border-orange-800",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

const statusBadgeVariant = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: "success", INACTIVE: "neutral", SUSPENDED: "destructive",
    VERIFIED: "success", UNVERIFIED: "warning", PENDING: "warning",
    INITIATED: "neutral", PROCESSING: "warning", AUTHORIZED: "info",
    CAPTURED: "success", SETTLED: "success", FAILED: "destructive",
    REFUNDED: "purple", DISPUTED: "orange",
    APPROVE: "success", REVIEW: "warning", DECLINE: "destructive",
    OPEN: "warning", UNDER_REVIEW: "info", RESOLVED: "success",
    MERCHANT_WON: "success", MERCHANT_LOST: "destructive",
  };
  return map[status] || "neutral";
};

export { Badge, statusBadgeVariant };
