"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Key, Globe, RefreshCw } from "lucide-react";

export default function DevelopersPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/api-keys`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.length) setApiKey(data.data[0].key);
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Developers</h1>
        <p className="text-sm text-gray-500 mt-1">API keys, webhooks, and integration settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key size={20} className="text-blue-600" />
              <CardTitle>API Keys</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiKey ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <code className="text-sm font-mono text-gray-700">{apiKey.slice(0, 20)}...</code>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(apiKey)}>
                    <Copy size={14} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <RefreshCw size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No API keys generated yet.</p>
            )}
            <Button size="sm">Generate New Key</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-blue-600" />
              <CardTitle>Webhooks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Configure webhook endpoints to receive real-time payment events.
            </p>
            {webhooks.length > 0 ? (
              webhooks.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{w.url}</p>
                    <Badge variant={statusBadgeVariant(w.status) as any} className="mt-1">
                      {w.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">No webhooks configured.</p>
            )}
            <Button size="sm">Add Endpoint</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="font-medium mb-1">Charge a payment</p>
              <code className="text-xs text-gray-600 block">
                POST /api/v1/payments/charges{`\n`}
                {`{ "amount": 1000, "currency": "USD", "card": { ... } }`}
              </code>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="font-medium mb-1">Headers</p>
              <code className="text-xs text-gray-600 block">
                x-api-key: {"<your_api_key>"}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
