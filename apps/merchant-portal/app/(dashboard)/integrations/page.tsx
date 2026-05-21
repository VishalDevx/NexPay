"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, BookOpen, Zap, Database, Table, ExternalLink,
  Check, ChevronRight, ArrowRight,
} from "lucide-react";

const integrations = [
  {
    category: "E-commerce",
    items: [
      { name: "Shopify", desc: "One-click install. OAuth connect. Auto-maps orders.", status: "Available", icon: ShoppingCart },
      { name: "WooCommerce", desc: "WordPress plugin. Sync orders, payments, refunds.", status: "Available", icon: ShoppingCart },
      { name: "Magento", desc: "Adobe Commerce extension. Full payment lifecycle.", status: "Beta", icon: ShoppingCart },
      { name: "PrestaShop", desc: "Module with webhook-based order sync.", status: "Available", icon: ShoppingCart },
    ],
  },
  {
    category: "Accounting",
    items: [
      { name: "QuickBooks", desc: "Sync settlements, fees, refunds as journal entries.", status: "Available", icon: BookOpen },
      { name: "Xero", desc: "Two-way sync. Reconcile directly in Xero.", status: "Available", icon: BookOpen },
      { name: "Zoho Books", desc: "Automated journal entries for all transactions.", status: "Beta", icon: BookOpen },
      { name: "Tally", desc: "ERP integration for Indian accounting compliance.", status: "Available", icon: BookOpen },
    ],
  },
  {
    category: "Automation",
    items: [
      { name: "Zapier", desc: "3000+ app automations. Triggers: payment.success, dispute.raised.", status: "Available", icon: Zap },
      { name: "Make.com", desc: "Visual workflow builder. No-code integrations.", status: "Available", icon: Zap },
    ],
  },
  {
    category: "Data & Analytics",
    items: [
      { name: "BigQuery", desc: "Nightly export. Parquet format. Partitioned by date.", status: "Available", icon: Database },
      { name: "Snowflake", desc: "Direct data share. Schema documented.", status: "Available", icon: Database },
      { name: "Google Sheets", desc: "Live transaction data. Auto-refresh. Pivot-ready.", status: "Available", icon: Table },
      { name: "S3 / GCS", desc: "Raw export. JSON-L format. Full + incremental.", status: "Available", icon: Database },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations & Ecosystem</h1>
        <p className="text-sm text-gray-500 mt-1">Connect NexPay with your existing tools and platforms</p>
      </div>

      {integrations.map((group) => (
        <div key={group.category}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.name} className="hover:shadow-md transition group">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Badge variant={item.status === "Available" ? "success" : "warning"}>{item.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                      <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        <Button size="sm" variant="outline" className="text-xs">
                          <ExternalLink className="w-3 h-3 mr-1" /> Connect
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs">Learn more</Button>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Need a custom integration?</h3>
            <p className="text-sm text-gray-600">We have a public API and webhooks for everything. Build your own.</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white shrink-0">
            API Reference <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
