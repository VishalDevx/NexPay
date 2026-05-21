"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Loader2, CreditCard, DollarSign, Percent, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

const plans = [
  { id: "starter", name: "Starter", price: 0, label: "$0", interval: "month", transactionFee: "2.9% + $0.30", features: ["Up to 500 transactions/mo", "Basic analytics", "Email support", "Standard checkout"] },
  { id: "growth", name: "Growth", price: 99, label: "$99/mo", interval: "month", transactionFee: "2.5% + $0.25", features: ["Up to 5,000 transactions/mo", "Advanced analytics", "Priority email & chat support", "Custom checkout", "API access"] },
  { id: "business", name: "Business", price: 499, label: "$499/mo", interval: "month", transactionFee: "2.0% + $0.20", features: ["Up to 50,000 transactions/mo", "Real-time analytics", "Phone & chat support", "White-label checkout", "Full API access", "Dedicated account manager"] },
  { id: "enterprise", name: "Enterprise", price: -1, label: "Custom", interval: "month", transactionFee: "Negotiable", features: ["Unlimited transactions", "Custom analytics", "24/7 dedicated support", "Fully custom checkout", "Enterprise API", "Dedicated engineering team", "SLA guarantees"] },
];

const invoiceStatusVariant = (status: string) => {
  const map: Record<string, string> = {
    PAID: "success",
    PENDING: "warning",
    OVERDUE: "destructive",
    CANCELLED: "neutral",
  };
  return map[status] || "neutral";
};

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [feeSchedule, setFeeSchedule] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [planRes, feeRes, invoiceRes] = await Promise.all([
          api.get<any>("/billing/plan").catch(() => ({ data: null })),
          api.get<any>("/billing/fee-schedule").catch(() => ({ data: null })),
          api.get<any>("/billing/invoices").catch(() => ({ data: [] })),
        ]);
        const sub = planRes.subscription;
        if (sub && sub.plan) {
          const p = sub.plan;
          setCurrentPlan({
            id: sub.planId || p.id,
            planId: sub.planId,
            name: p.name,
            price: Number(p.monthlyPrice),
            interval: "mo",
            transactionFee: `${p.transactionFee}% + $${p.fixedFee}`,
            features: p.features,
            label: Number(p.monthlyPrice) === 0 ? "Free" : `$${p.monthlyPrice}/mo`,
            status: sub.status,
          });
        } else {
          setCurrentPlan(null);
        }
        setFeeSchedule(feeRes.data || feeRes);
        setInvoices(invoiceRes.data || invoiceRes || []);
      } catch (err) {
        console.error("Failed to fetch billing data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const res = await api.post<any>("/billing/subscribe", { planId });
      setCurrentPlan(res.data || res);
    } catch (err) {
      console.error("Failed to subscribe:", err);
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const isCurrentPlan = (planId: string) => currentPlan?.id === planId || currentPlan?.planId === planId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your subscription, view fees, and invoices</p>
      </div>

      {currentPlan && (
        <Card>
          <CardHeader><CardTitle>Current Subscription</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{currentPlan.name}</p>
                <p className="text-sm text-gray-500">
                  {currentPlan.price === 0 ? "Free" : currentPlan.price != null ? `$${currentPlan.price}/${currentPlan.interval || "mo"}` : currentPlan.label || "Custom"}
                  {currentPlan.transactionFee ? ` · ${currentPlan.transactionFee}` : ""}
                </p>
              </div>
              <Badge variant="success" className="text-sm px-3 py-1">Active</Badge>
            </div>
            {currentPlan.features && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentPlan.features.map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> {f}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Available Plans</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={`border-2 ${isCurrentPlan(plan.id) ? "border-blue-500" : "border-gray-200"}`}>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-lg font-bold">{plan.name}</p>
                    <p className="text-2xl font-bold mt-1">{plan.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{plan.transactionFee} per transaction</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${isCurrentPlan(plan.id) ? "bg-gray-100 text-gray-500 cursor-default" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
                    onClick={() => !isCurrentPlan(plan.id) && handleSubscribe(plan.id)}
                    disabled={isCurrentPlan(plan.id) || subscribing === plan.id}
                  >
                    {subscribing === plan.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {isCurrentPlan(plan.id) ? "Current Plan" : plan.id === "enterprise" ? "Contact Sales" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fee Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: "MDR", value: feeSchedule?.mdr != null ? `${feeSchedule.mdr}%` : "2.5%", icon: Percent },
              { label: "Fixed Fee", value: feeSchedule?.fixedFee != null ? `$${feeSchedule.fixedFee}` : "$0.25", icon: DollarSign },
              { label: "International Markup", value: feeSchedule?.internationalMarkup != null ? `${feeSchedule.internationalMarkup}%` : "1.5%", icon: Percent },
              { label: "Payout Fee", value: feeSchedule?.payoutFee != null ? `$${feeSchedule.payoutFee}` : "$0.50", icon: DollarSign },
              { label: "Refund Fee", value: feeSchedule?.refundFee != null ? `$${feeSchedule.refundFee}` : "$0.15", icon: DollarSign },
              { label: "Chargeback Fee", value: feeSchedule?.chargebackFee != null ? `$${feeSchedule.chargebackFee}` : "$15.00", icon: DollarSign },
              { label: "UPI MDR", value: feeSchedule?.upiMdr != null ? `${feeSchedule.upiMdr}%` : "0.5%", icon: Percent },
            ].map((fee) => {
              const Icon = fee.icon;
              return (
                <div key={fee.label} className="bg-gray-50 rounded-xl p-4 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{fee.label}</span>
                  </div>
                  <p className="text-lg font-bold">{fee.value}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Paid Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((inv: any, i: number) => (
                  <TableRow key={inv.id || i}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber || inv.id}</TableCell>
                    <TableCell className="font-medium">${Number(inv.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(inv.status) as any}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {inv.periodStart && inv.periodEnd
                        ? `${new Date(inv.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(inv.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No invoices yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
