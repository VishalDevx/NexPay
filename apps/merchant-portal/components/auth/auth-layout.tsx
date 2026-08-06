import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  footer?: React.ReactNode;
}

export function AuthLayout({ children, title, description, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-foreground/10">
            <span className="text-sm font-bold">N</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">NexPay</span>
        </Link>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight text-balance leading-tight">
            Payment infrastructure built for modern businesses
          </h2>
          <p className="text-sm text-primary-foreground/70 leading-relaxed">
            Accept payments, manage payouts, and reconcile ledgers — all from one minimal dashboard.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">© NexPay · Secure · PCI-ready</p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-primary-foreground">N</span>
              </div>
              <span className="text-sm font-semibold">NexPay</span>
            </Link>
          </div>

          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>

          {children}

          {footer && (
            <p className="mt-8 text-center text-[13px] text-muted-foreground">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[13px] font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export const authInputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
      <p className="text-[13px] text-destructive">{message}</p>
    </div>
  );
}
