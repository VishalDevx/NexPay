import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Shield,
  Settings,
  Users,
  Beaker,
  BookOpen,
  BarChart3,
  Webhook,
  Receipt,
  Bell,
  LifeBuoy,
  Plug,
  Scale,
  KeyRound,
  Link2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/transactions", label: "Transactions", icon: CreditCard },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/payouts", label: "Payouts", icon: Wallet },
      { href: "/disputes", label: "Disputes", icon: Shield },
      { href: "/invoicing", label: "Invoicing", icon: Receipt },
      { href: "/payment-links", label: "Payment Links", icon: Link2 },
      { href: "/general-ledger", label: "Ledger", icon: BookOpen },
      { href: "/reconciliation", label: "Reconciliation", icon: Scale },
    ],
  },
  {
    label: "Developers",
    items: [
      { href: "/developers", label: "API Keys", icon: KeyRound },
      { href: "/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/sandbox", label: "Sandbox", icon: Beaker },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/team", label: "Team", icon: Users },
      { href: "/support", label: "Support", icon: LifeBuoy },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items);

export function getPageTitle(pathname: string): string {
  const item = allNavItems.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/")
  );
  if (item) return item.label;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  return segments[segments.length - 1]
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}
