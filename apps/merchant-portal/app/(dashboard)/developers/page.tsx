"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Copy, Key, Globe, RefreshCw, Plus, Trash2, Webhook, Check, X, Play, ToggleLeft, ToggleRight, Eye, EyeOff } from "lucide-react";

export default function DevelopersPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyEnv, setNewKeyEnv] = useState<"LIVE" | "TEST">("TEST");
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["payment.captured"]);
  const [copied, setCopied] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("ALL");

  const token = typeof window !== "undefined" ? localStorage.getItem("nexpay_token") : "";

  const fetchKeys = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/api-keys`, {
      headers: { "x-api-key": token || "" },
    }).then((r) => r.json()).then((data) => setApiKeys(data.data || []));
  };

  const fetchWebhooks = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/webhooks`, {
      headers: { "x-api-key": token || "" },
    }).then((r) => r.json()).then((data) => setWebhooks(data.data || []));
  };

  const fetchDeliveries = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/webhooks/deliveries`, {
      headers: { "x-api-key": token || "" },
    }).then((r) => r.json()).then((data) => setDeliveries(data.data || []));
  };

  useEffect(() => { fetchKeys(); fetchWebhooks(); fetchDeliveries(); }, []);

  const generateKey = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": token || "" },
      body: JSON.stringify({ env: newKeyEnv }),
    });
    const data = await res.json();
    if (data.apiKey) {
      setShowKey(data.apiKey.key);
      fetchKeys();
    }
  };

  const revokeKey = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/api-keys/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": token || "" },
    });
    fetchKeys();
  };

  const createWebhook = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": token || "" },
      body: JSON.stringify({ url: webhookUrl, events: webhookEvents }),
    });
    const data = await res.json();
    if (data.endpoint) {
      setShowKey(data.endpoint.secret);
      setShowWebhookForm(false);
      setWebhookUrl("");
      fetchWebhooks();
    }
  };

  const replayDelivery = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/webhooks/deliveries/${id}/replay`, {
      method: "POST",
      headers: { "x-api-key": token || "" },
    });
    fetchDeliveries();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const availableEvents = [
    "payment.created", "payment.captured", "payment.failed", "payment.refunded",
    "dispute.raised", "dispute.resolved", "payout.paid", "payout.failed",
  ];

  const filteredDeliveries = deliveryFilter === "ALL" ? deliveries : deliveries.filter((d) => d.status === deliveryFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Developers</h1>
        <p className="text-sm text-gray-500 mt-1">API keys, webhooks, and integration settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <CardTitle>API Keys</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Select value={newKeyEnv} onChange={(e) => setNewKeyEnv(e.target.value as any)} className="w-24">
                  <option value="LIVE">Live</option>
                  <option value="TEST">Test</option>
                </Select>
                <Button size="sm" onClick={generateKey}><Plus className="w-4 h-4 mr-1" /> Generate</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {apiKeys.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No API keys generated yet</p>}
            {apiKeys.map((key: any) => (
              <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Badge variant={key.env === "LIVE" ? "success" : "warning"}>{key.env}</Badge>
                  <div>
                    <code className="text-sm font-mono">{key.prefix}••••••••</code>
                    <p className="text-xs text-gray-500">Created {new Date(key.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => revokeKey(key.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {showKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 font-medium mb-1">⚠️ Copy your key now. It won&apos;t be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white rounded px-2 py-1.5 border break-all">{showKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(showKey, "key")}>
                    {copied === "key" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <CardTitle>Webhook Endpoints</CardTitle>
              </div>
              <Button size="sm" onClick={() => setShowWebhookForm(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {webhooks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No webhook endpoints configured</p>}
            {webhooks.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${w.enabled ? "bg-emerald-500" : "bg-gray-300"}`} />
                    <p className="text-sm font-medium truncate">{w.url}</p>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {(w.events || []).slice(0, 3).map((e: string) => (
                      <Badge key={e} variant="neutral" className="text-[10px]">{e}</Badge>
                    ))}
                    {(w.events || []).length > 3 && (
                      <Badge variant="neutral" className="text-[10px]">+{w.events.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {showWebhookForm && (
              <div className="border rounded-xl p-4 space-y-3">
                <Input
                  placeholder="https://api.your-app.com/webhooks/nexpay"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <div>
                  <p className="text-xs text-gray-500 mb-2">Events to listen to:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableEvents.map((ev) => (
                      <button
                        key={ev}
                        onClick={() => setWebhookEvents(
                          webhookEvents.includes(ev)
                            ? webhookEvents.filter((e) => e !== ev)
                            : [...webhookEvents, ev]
                        )}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          webhookEvents.includes(ev)
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowWebhookForm(false)}>Cancel</Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={createWebhook} disabled={!webhookUrl}>
                    Create Endpoint
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" /> Webhook Delivery Logs
            </CardTitle>
            <Select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} className="w-32">
              <option value="ALL">All</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">No webhook deliveries yet</TableCell></TableRow>
              ) : (
                filteredDeliveries.slice(0, 10).map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{d.eventType || "payment.captured"}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(d.status) as any}>{d.status}</Badge></TableCell>
                    <TableCell>{d.attempts || 0}/5</TableCell>
                    <TableCell>
                      <span className={`text-xs font-mono ${d.httpStatus >= 400 ? "text-red-500" : "text-emerald-500"}`}>
                        {d.httpStatus || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{d.latency || "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500">{d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</TableCell>
                    <TableCell>
                      {d.status === "FAILED" && (
                        <Button variant="ghost" size="sm" onClick={() => replayDelivery(d.id)}>
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quick Start</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border">
              <p className="font-medium text-sm mb-2">Create a charge</p>
              <pre className="text-xs text-gray-600 font-mono">
                {`curl -X POST https://api.nexpay.com/v1/payments/charges \\
  -H "x-api-key: <your_key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: uuid" \\
  -d '{"amount": 1000, "currency": "USD"}'`}
              </pre>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyToClipboard(`curl -X POST https://api.nexpay.com/v1/payments/charges -H "x-api-key: <your_key>" -H "Content-Type: application/json" -H "Idempotency-Key: uuid" -d '{"amount": 1000, "currency": "USD"}'`, "curl")}>
                {copied === "curl" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                Copy
              </Button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border">
              <p className="font-medium text-sm mb-2">Verify webhook signature</p>
              <pre className="text-xs text-gray-600 font-mono">
                {`// Node.js
const crypto = require('crypto');
const sig = req.headers['x-nexpay-signature'];
const payload = JSON.stringify(req.body);
const expected = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');
// Compare sig === expected`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
