"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Building2, CreditCard, Wallet, Shield, Link, Globe, Repeat } from "lucide-react";

const paymentMethods = [
  {
    icon: Smartphone, name: "UPI / QR", status: "Live",
    desc: "GPay, PhonePe, Paytm. Generate UPI intent and QR codes.",
    color: "text-blue-600", bg: "bg-blue-50",
  },
  {
    icon: Building2, name: "Net Banking", status: "Live",
    desc: "50+ Indian banks. Redirect flow with callback.",
    color: "text-emerald-600", bg: "bg-emerald-50",
  },
  {
    icon: CreditCard, name: "EMI", status: "Beta",
    desc: "No-cost and standard EMI. Tenure 3/6/9/12 months.",
    color: "text-purple-600", bg: "bg-purple-50",
  },
  {
    icon: Wallet, name: "Wallet Payments", status: "Live",
    desc: "Paytm Wallet, Amazon Pay, Mobikwik. Split payment support.",
    color: "text-amber-600", bg: "bg-amber-50",
  },
  {
    icon: Shield, name: "3D Secure 2.0", status: "Live",
    desc: "Frictionless and challenge flows. Liability shift on success.",
    color: "text-indigo-600", bg: "bg-indigo-50",
  },
  {
    icon: Link, name: "Payment Links", status: "Live",
    desc: "No-code shareable links. Set amount, expiry, max uses.",
    color: "text-rose-600", bg: "bg-rose-50",
  },
  {
    icon: Globe, name: "Hosted Payment Page", status: "Live",
    desc: "Fully branded checkout. No PCI scope. Mobile-optimized.",
    color: "text-cyan-600", bg: "bg-cyan-50",
  },
  {
    icon: Repeat, name: "Subscriptions", status: "Beta",
    desc: "Recurring plans. e-NACH / card-on-file mandates. Auto-retry.",
    color: "text-violet-600", bg: "bg-violet-50",
  },
];

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <p className="text-sm text-gray-500 mt-1">Configure and manage payment methods for your checkout</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {paymentMethods.map((pm) => {
          const Icon = pm.icon;
          return (
            <Card key={pm.name} className="hover:shadow-md transition group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${pm.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${pm.color}`} />
                  </div>
                  <Badge variant={pm.status === "Live" ? "success" : "warning"}>{pm.status}</Badge>
                </div>
                <h3 className="font-semibold mb-1">{pm.name}</h3>
                <p className="text-sm text-gray-500">{pm.desc}</p>
                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <Button variant="outline" size="sm" className="text-xs">Configure</Button>
                  <Button variant="ghost" size="sm" className="text-xs">Docs</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Payment Method Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.slice(0, 3).map((pm) => (
              <div key={pm.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div className="flex items-center gap-3">
                  <pm.icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{pm.name}</p>
                    <p className="text-sm text-gray-500">Enabled · Default priority: Standard</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
