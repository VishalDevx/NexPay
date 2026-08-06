import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  loading?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, loading, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 transition-colors hover:border-foreground/15",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground">
          <Icon size={16} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
