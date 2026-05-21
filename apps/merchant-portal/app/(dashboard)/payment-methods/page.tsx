"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Building2, CreditCard, Wallet, Shield, Link, Globe, Repeat, type LucideIcon } from "lucide-react";

interface MethodConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const methodConfig: Record<string, MethodConfig> = {
  "UPI / QR": { icon: Smartphone, color: "text-blue-600", bg: "bg-blue-50" },
  "Net Banking": { icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
  "EMI": { icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
  "Wallet Payments": { icon: Wallet, color: "text-amber-600", bg: "bg-amber-50" },
  "3D Secure 2.0": { icon: Shield, color: "text-indigo-600", bg: "bg-indigo-50" },
  "Payment Links": { icon: Link, color: "text-rose-600", bg: "bg-rose-50" },
  "Hosted Payment Page": { icon: Globe, color: "text-cyan-600", bg: "bg-cyan-50" },
  "Subscriptions": { icon: Repeat, color: "text-violet-600", bg: "bg-violet-50" },
};

const defaultConfig: MethodConfig = { icon: CreditCard, color: "text-gray-600", bg: "bg-gray-50" };

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>("/payment-methods").then(r => setMethods(r.data || [])).catch(console.error);
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.put("/payment-methods/" + id, { enabled });
      setMethods(prev => prev.map(m => m.id === id ? { ...m, enabled } : m));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <p className="text-sm text-gray-500 mt-1">Configure and manage payment methods for your checkout</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {methods.map((pm) => {
          const cfg = methodConfig[pm.name] || defaultConfig;
          const Icon = cfg.icon;
          return (
            <Card key={pm.id || pm.name} className="hover:shadow-md transition group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                  </div>
                  <Badge variant={pm.status === "Live" ? "success" : "warning"}>{pm.status}</Badge>
                </div>
                <h3 className="font-semibold mb-1">{pm.name}</h3>
                <p className="text-sm text-gray-500">{pm.description || pm.desc}</p>
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
            {methods.slice(0, 3).map((pm) => {
              const cfg = methodConfig[pm.name] || defaultConfig;
              const Icon = cfg.icon;
              return (
                <div key={pm.id || pm.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{pm.name}</p>
                      <p className="text-sm text-gray-500">{pm.enabled ? "Enabled" : "Disabled"} · Default priority: Standard</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pm.enabled ?? true}
                      onChange={(e) => handleToggle(pm.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
