"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { navGroups, getPageTitle, isNavActive } from "./nav-config";
import type { LucideIcon } from "lucide-react";
import { useOnboardingGuard } from "@/lib/hooks/use-onboarding-guard";

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
        <span className="text-xs font-bold text-primary-foreground">N</span>
      </div>
      {!compact && (
        <span className="truncate text-sm font-semibold tracking-tight">NexPay</span>
      )}
    </Link>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  compact,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        compact && "justify-center px-2"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <Icon size={16} strokeWidth={active ? 2 : 1.75} className="shrink-0" />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

function SidebarContent({
  compact,
  pathname,
  merchant,
  onNavigate,
  onSignOut,
}: {
  compact: boolean;
  pathname: string;
  merchant: { name?: string; email?: string } | null;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!compact && (
              <p className="mb-1.5 px-2.5 text-[11px] font-medium text-muted-foreground/80">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isNavActive(pathname, item.href)}
                  compact={compact}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        {!compact && merchant && (
          <div className="mb-2 truncate px-2.5 py-1">
            <p className="truncate text-[13px] font-medium">{merchant.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{merchant.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
            compact && "justify-center"
          )}
        >
          <LogOut size={16} strokeWidth={1.75} />
          {!compact && "Sign out"}
        </button>
      </div>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { merchant, loading, signOut } = useAuth();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  useOnboardingGuard();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex h-screen sticky top-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
          compact ? "w-[60px]" : "w-[240px]"
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-sidebar-border px-3", compact ? "justify-center" : "justify-between")}>
          <Logo compact={compact} />
          {!compact && (
            <button
              type="button"
              onClick={() => setCompact(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
        {compact && (
          <div className="flex justify-center border-b border-sidebar-border py-2">
            <button
              type="button"
              onClick={() => setCompact(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
              aria-label="Expand sidebar"
            >
              <PanelLeft size={16} />
            </button>
          </div>
        )}
        <SidebarContent compact={compact} pathname={pathname} merchant={merchant} onSignOut={signOut} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(280px,85vw)] flex-col border-r border-sidebar-border bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent compact={false} pathname={pathname} merchant={merchant} onNavigate={() => setMobileOpen(false)} onSignOut={signOut} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="hidden flex-1 sm:block">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search…"
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                readOnly
              />
            </div>
          </div>

          <p className="flex-1 truncate text-sm font-medium sm:hidden">{pageTitle}</p>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
              Live
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-muted">
                      {merchant?.name?.charAt(0)?.toUpperCase() || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate text-[13px] font-medium md:block">
                    {merchant?.name || "Merchant"}
                  </span>
                  <ChevronDown size={14} className="hidden text-muted-foreground md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{merchant?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{merchant?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/team">Team</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={signOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
