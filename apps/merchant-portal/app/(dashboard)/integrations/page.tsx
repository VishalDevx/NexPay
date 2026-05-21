"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, BookOpen, Zap, Database, Table, ExternalLink,
  Check, ChevronRight, ArrowRight, X, type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Shopify: ShoppingCart, WooCommerce: ShoppingCart, Magento: ShoppingCart, PrestaShop: ShoppingCart,
  QuickBooks: BookOpen, Xero: BookOpen, "Zoho Books": BookOpen, Tally: BookOpen,
  Zapier: Zap, "Make.com": Zap,
  BigQuery: Database, Snowflake: Database, "Google Sheets": Table, "S3 / GCS": Database,
};

const defaultIcon = ShoppingCart;

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState({ apiKey: "", apiSecret: "" });

  useEffect(() => {
    api.get<any>("/integrations").then(r => setIntegrations(r.data || [])).catch(console.error);
  }, []);

  const handleConnect = async () => {
    if (!connectingId) return;
    try {
      await api.post("/integrations/" + connectingId + "/connect", connectForm);
      setIntegrations(prev => prev.map((g) => ({
        ...g,
        items: g.items.map((i: any) => i.id === connectingId ? { ...i, status: "Connected" } : i),
      })));
      setConnectingId(null);
      setConnectForm({ apiKey: "", apiSecret: "" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await api.post("/integrations/" + id + "/disconnect");
      setIntegrations(prev => prev.map((g) => ({
        ...g,
        items: g.items.map((i: any) => i.id === id ? { ...i, status: "Available" } : i),
      })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations & Ecosystem</h1>
        <p className="text-sm text-gray-500 mt-1">Connect NexPay with your existing tools and platforms</p>
      </div>

      {integrations.map((group) => (
        <div key={group.category || group.name}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.category || group.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(group.items || [group]).map((item: any) => {
              const Icon = iconMap[item.name] || defaultIcon;
              const isConnected = item.status === "Connected";
              return (
                <Card key={item.id || item.name} className="hover:shadow-md transition group">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Badge variant={!isConnected ? "success" : "info"}>{isConnected ? "Connected" : item.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{item.description || item.desc}</p>
                      <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        {isConnected ? (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDisconnect(item.id)}>
                            <X className="w-3 h-3 mr-1" /> Disconnect
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => setConnectingId(item.id)}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Connect
                          </Button>
                        )}
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

      {connectingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connect Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">API Key</label>
                <Input
                  value={connectForm.apiKey}
                  onChange={(e) => setConnectForm({ ...connectForm, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">API Secret</label>
                <Input
                  type="password"
                  value={connectForm.apiSecret}
                  onChange={(e) => setConnectForm({ ...connectForm, apiSecret: e.target.value })}
                  placeholder="Enter your API secret"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setConnectingId(null); setConnectForm({ apiKey: "", apiSecret: "" }); }}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleConnect}>
                  <Check className="w-4 h-4 mr-1" /> Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
