"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/health", label: "Health" },
  { href: "/merchants", label: "Merchants" },
  { href: "/kyc", label: "KYC" },
  { href: "/disputes", label: "Disputes" },
  { href: "/fraud-rules", label: "Fraud" },
  { href: "/integrity", label: "Integrity" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAdminAuth();

  return (
    <div className="min-h-screen bg-[#fafafa] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
              <Shield size={14} className="text-background" />
            </div>
            <span className="text-sm font-semibold">NexPay Admin</span>
            <Badge variant="neutral" className="text-[10px]">Internal</Badge>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
        <nav className="mb-6 flex gap-1 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname === item.href
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/observability"
            className="shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent"
          >
            Observability
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
