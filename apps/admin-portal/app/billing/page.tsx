"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DollarSign, Users, FileText, RefreshCw, Activity } from "lucide-react";

type Tab = "subscriptions" | "invoices" | "plans";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-900/50 text-emerald-400",
  CANCELED: "bg-slate-700 text-slate-400",
  PAST_DUE: "bg-red-900/50 text-red-400",
  TRIALING: "bg-blue-900/50 text-blue-400",
  EXPIRED: "bg-amber-900/50 text-amber-400",
  PENDING: "bg-amber-900/50 text-amber-400",
  PAID: "bg-emerald-900/50 text-emerald-400",
  OVERDUE: "bg-red-900/50 text-red-400",
  VOID: "bg-slate-700 text-slate-400",
};

export default function AdminBillingPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [token, setToken] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";

  useEffect(() => {
    const t = localStorage.getItem("nexpay_admin_token");
    if (t) setToken(t);
  }, []);

  const adminFetch = async (path: string, opts?: any) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-api-key": token || "", ...opts?.headers },
    });
    return res.json();
  };

  const loadSubscriptions = async () => {
    const data = await adminFetch("/api/v1/admin/billing/subscriptions");
    setSubscriptions(data.data || []);
  };

  const loadInvoices = async () => {
    const data = await adminFetch("/api/v1/admin/billing/invoices");
    setInvoices(data.data || []);
  };

  const loadPlans = async () => {
    const data = await adminFetch("/api/v1/admin/billing/plans");
    setPlans(data.data || []);
  };

  useEffect(() => {
    if (!token) return;
    if (tab === "subscriptions") loadSubscriptions();
    else if (tab === "invoices") loadInvoices();
    else if (tab === "plans") loadPlans();
  }, [tab, token]);

  const generateInvoices = async () => {
    setGenerating(true);
    await adminFetch("/api/v1/admin/billing/invoices/generate", { method: "POST" });
    await loadInvoices();
    setGenerating(false);
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "subscriptions", label: "Subscriptions", icon: <Users className="w-4 h-4" /> },
    { key: "invoices", label: "Invoices", icon: <FileText className="w-4 h-4" /> },
    { key: "plans", label: "Plans", icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing Management</h1>
        {tab === "invoices" && (
          <Button onClick={generateInvoices} disabled={generating} className="bg-emerald-700 hover:bg-emerald-600">
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate Invoices"}
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              tab === t.key ? "bg-slate-800 text-white border-b-2 border-emerald-500" : "text-slate-400 hover:text-white"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "subscriptions" && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader><CardTitle className="text-lg">All Subscriptions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.merchant?.name || sub.merchantId}</TableCell>
                    <TableCell>{sub.plan?.name || "-"}</TableCell>
                    <TableCell><Badge className={statusColors[sub.status] || ""}>{sub.status}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {new Date(sub.currentPeriodStart).toLocaleDateString()} - {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{(sub as any)._count?.invoices || sub.invoices?.length || 0}</TableCell>
                  </TableRow>
                ))}
                {subscriptions.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No subscriptions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "invoices" && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Billing Invoices</CardTitle>
            <div className="flex gap-2">
              <Button onClick={loadInvoices} variant="outline" size="sm" className="border-slate-600"><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.subscription?.merchant?.name || "-"}</TableCell>
                    <TableCell>${Number(inv.total).toFixed(2)}</TableCell>
                    <TableCell><Badge className={statusColors[inv.status] || ""}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {new Date(inv.periodStart).toLocaleDateString()} - {new Date(inv.periodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "-"}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No invoices found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "plans" && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader><CardTitle className="text-lg">Merchant Plans</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="bg-slate-800 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge className={statusColors[plan.tier] || ""}>{plan.tier}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Monthly Price</span><span>${Number(plan.monthlyPrice).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">MDR</span><span>{Number(plan.transactionFee).toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Fixed Fee</span><span>${Number(plan.fixedFee).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Intl Markup</span><span>{Number(plan.internationalMarkup).toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Max Volume</span><span>{plan.maxMonthlyVolume ? `$${Number(plan.maxMonthlyVolume).toLocaleString()}` : "Unlimited"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Team Members</span><span>{plan.teamMembers || "Unlimited"}</span></div>
                    {plan.features && Array.isArray(plan.features) && (
                      <div className="pt-2 border-t border-slate-600">
                        <div className="text-slate-400 mb-1">Features:</div>
                        {plan.features.map((f: string, i: number) => (
                          <div key={i} className="flex items-center gap-1 text-xs text-slate-300">- {f}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
