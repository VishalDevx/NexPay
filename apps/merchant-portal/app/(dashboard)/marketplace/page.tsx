"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  LayoutDashboard, Users, FileText, RefreshCw, DollarSign,
  Check, Copy, ExternalLink, Play,
} from "lucide-react";

export default function MarketplacePage() {
  const [splitPreview, setSplitPreview] = useState({ seller: 85, platform: 13, tax: 2 });
  const [dashboard, setDashboard] = useState<any>({ gmv: 0, commission: 0, activeSellers: 0, topSeller: null });
  const [subMerchants, setSubMerchants] = useState<any[]>([]);
  const [splitRules, setSplitRules] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMarketplace() {
      try {
        const [dashRes, subRes, splitRes] = await Promise.all([
          api.get<any>("/marketplace/dashboard"),
          api.get<any>("/marketplace/sub-merchants"),
          api.get<any>("/marketplace/split-rules"),
        ]);
        setDashboard(dashRes);
        setSubMerchants(subRes.data || []);
        setSplitRules(splitRes.data || []);
      } catch (err) {
        console.error("Marketplace fetch error:", err);
      }
    }
    fetchMarketplace();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace & Platform</h1>
        <p className="text-sm text-gray-500 mt-1">Split payments, route-based payouts, and seller management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Split Payment Rules</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { label: "Seller payout", key: "seller" as const, color: "bg-blue-500" },
                { label: "Platform commission", key: "platform" as const, color: "bg-emerald-500" },
                { label: "Tax reserve", key: "tax" as const, color: "bg-amber-500" },
              ].map((r) => (
                <div key={r.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{r.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={splitPreview[r.key]}
                        onChange={(e) => setSplitPreview({ ...splitPreview, [r.key]: parseInt(e.target.value) || 0 })}
                        className="w-16 border rounded px-2 py-0.5 text-sm text-right"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${r.color} h-2 rounded-full`} style={{ width: `${splitPreview[r.key]}%` }} />
                  </div>
                </div>
              ))}
              <div className="text-sm text-gray-500 pt-2 border-t">
                Total: <strong>{splitPreview.seller + splitPreview.platform + splitPreview.tax}%</strong>
                {splitPreview.seller + splitPreview.platform + splitPreview.tax !== 100 && (
                  <span className="text-red-500 ml-2">Must equal 100%</span>
                )}
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white"><RefreshCw className="w-4 h-4 mr-1" /> Apply Routing Rule</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Platform Dashboard</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Total GMV</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboard.gmv >= 1000000
                    ? `$${(dashboard.gmv / 1000000).toFixed(1)}M`
                    : `$${(dashboard.gmv / 1000).toFixed(1)}K`}
                </p>
                <p className="text-xs text-emerald-600">+23% vs last month</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Commission Earned</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${(dashboard.commission / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Active Sellers</p>
                <p className="text-2xl font-bold text-amber-600">{dashboard.activeSellers}</p>
                <p className="text-xs text-gray-500">+12 this week</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Top Seller</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {dashboard.topSeller
                    ? `$${(dashboard.topSeller.revenue / 1000).toFixed(1)}K`
                    : "--"}
                </p>
                <p className="text-xs text-gray-500">{dashboard.topSeller?.name || "N/A"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full"><LayoutDashboard className="w-4 h-4 mr-1" /> Open Platform Dashboard</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Seller Onboarding API</CardTitle>
            <Badge variant="info">Programmatic</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-xl p-4 border">
            <pre className="text-sm font-mono text-gray-600">
              {`POST /api/v1/marketplace/sellers
{
  "name": "Seller Business",
  "email": "seller@example.com",
  "commission": 5,
  "kyc": { "pan": "ABCDE1234F", "bank_ifsc": "HDFC0001234" }
}

→ Webhook: seller.approved`}
            </pre>
            <Button variant="ghost" size="sm" className="mt-2"><Copy className="w-3 h-3 mr-1" /> Copy example</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
