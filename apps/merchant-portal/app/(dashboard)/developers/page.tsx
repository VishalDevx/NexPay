"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Key, Globe, Copy, Check, Plus, Trash2, X, Eye, EyeOff,
  Search, Filter, BookOpen, CheckSquare, Square, ExternalLink,
  Terminal, Code, RefreshCw, ListOrdered, Activity, Loader2,
} from "lucide-react";
import api from "@/lib/api";

const SCOPES = [
  { value: "charges:read", label: "Charges Read" },
  { value: "charges:write", label: "Charges Write" },
  { value: "refunds:write", label: "Refunds Write" },
  { value: "disputes:read", label: "Disputes Read" },
  { value: "disputes:write", label: "Disputes Write" },
  { value: "customers:read", label: "Customers Read" },
  { value: "customers:write", label: "Customers Write" },
  { value: "payouts:read", label: "Payouts Read" },
  { value: "webhooks:write", label: "Webhooks Write" },
];

const QUICKSTART_STEPS = [
  { id: "create_key", label: "Create API key", section: "api-keys" },
  { id: "setup_webhook", label: "Set up webhook endpoint", section: "webhooks" },
  { id: "verify_signature", label: "Verify webhook signature", section: "webhooks" },
  { id: "first_payment", label: "Process first payment", section: "quickstart" },
  { id: "handle_refund", label: "Handle refund", section: "quickstart" },
  { id: "test_sandbox", label: "Test sandbox mode", section: "quickstart" },
];

const INTEGRATION_CHECKLIST = [
  { id: "create_key", label: "Create API key", link: "#api-keys", done: false },
  { id: "setup_webhook", label: "Set up webhook endpoint", link: "/webhooks", done: false },
  { id: "verify_signature", label: "Verify webhook signature", link: "#quickstart", done: false },
  { id: "first_payment", label: "Process first payment", link: "#quickstart", done: false },
  { id: "handle_refund", label: "Handle refund", link: "#quickstart", done: false },
  { id: "test_sandbox", label: "Test sandbox mode", link: "/sandbox", done: false },
];

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState("api-keys");
  const [copied, setCopied] = useState("");

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"LIVE" | "TEST">("TEST");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["charges:read", "charges:write"]);

  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [apiLogsLoading, setApiLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showLogDetail, setShowLogDetail] = useState(false);
  const [logMethodFilter, setLogMethodFilter] = useState("ALL");
  const [logStatusFilter, setLogStatusFilter] = useState("ALL");
  const [logSearch, setLogSearch] = useState("");

  const [checklist, setChecklist] = useState(INTEGRATION_CHECKLIST);

  useEffect(() => {
    fetchApiKeys();
    fetchApiLogs();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await api.get<any>("/merchants/api-keys");
      setApiKeys(res.data || []);
    } catch (err) {
      console.error("Fetch keys error:", err);
    }
  };

  const fetchApiLogs = async () => {
    setApiLogsLoading(true);
    try {
      const res = await api.get<any>("/merchants/api-logs");
      setApiLogs(res.data || []);
    } catch (err) {
      console.error("Fetch logs error:", err);
    } finally {
      setApiLogsLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const res = await api.post<any>("/merchants/api-keys", {
        name: newKeyName,
        env: newKeyEnv,
        scopes: newKeyScopes,
      });
      if (res.apiKey?.key) {
        setShowKey(res.apiKey.key);
      }
      setShowCreateKeyModal(false);
      setNewKeyName("");
      setNewKeyEnv("TEST");
      setNewKeyScopes(["charges:read", "charges:write"]);
      await fetchApiKeys();
    } catch (err) {
      console.error("Create key error:", err);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await api.delete("/merchants/api-keys/" + id);
      await fetchApiKeys();
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const filteredLogs = apiLogs.filter((log) => {
    if (logMethodFilter !== "ALL" && log.method !== logMethodFilter) return false;
    if (logStatusFilter !== "ALL") {
      if (logStatusFilter === "2xx" && (log.status < 200 || log.status >= 300)) return false;
      if (logStatusFilter === "4xx" && (log.status < 400 || log.status >= 500)) return false;
      if (logStatusFilter === "5xx" && (log.status < 500 || log.status >= 600)) return false;
    }
    if (logSearch) {
      const q = logSearch.toLowerCase();
      if (!log.path.toLowerCase().includes(q) && !log.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const tabs = [
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "webhooks", label: "Webhooks", icon: Globe },
    { id: "api-logs", label: "API Logs", icon: Activity },
    { id: "checklist", label: "Integration Checklist", icon: CheckSquare },
    { id: "quickstart", label: "Quickstart Guide", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Developers</h1>
        <p className="text-sm text-gray-500 mt-1">API keys, webhooks, logs, and integration guides</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                activeTab === tab.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "api-keys" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <CardTitle>API Keys</CardTitle>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setShowCreateKeyModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Create Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 && !showKey && (
              <div className="text-center py-8">
                <Key className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No API keys yet</p>
                <p className="text-xs text-gray-400 mt-1">Create your first API key to start integrating</p>
              </div>
            )}

            <div className="space-y-3">
              {apiKeys.map((key: any) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant={key.env === "LIVE" ? "success" : "warning"}>{key.env}</Badge>
                    <div>
                      <code className="text-sm font-mono">{key.prefix}••••••••</code>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">Created {new Date(key.createdAt).toLocaleDateString()}</span>
                        {key.lastUsedAt && (
                          <span className="text-xs text-gray-400">· Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        )}
                        {key.revokedAt && (
                          <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {(key.scopes || []).slice(0, 4).map((s: string) => (
                          <Badge key={s} variant="neutral" className="text-[10px]">{s}</Badge>
                        ))}
                        {(key.scopes || []).length > 4 && (
                          <Badge variant="neutral" className="text-[10px]">+{key.scopes.length - 4}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!key.revokedAt && (
                      <Button variant="ghost" size="sm" onClick={() => revokeKey(key.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {showKey && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 font-medium mb-1">Copy your key now. It won&apos;t be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white rounded px-2 py-1.5 border break-all">{showKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(showKey, "new-key")}>
                    {copied === "new-key" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "webhooks" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" /> Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Manage your webhook endpoints, view delivery logs, and test events from the dedicated webhooks page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/webhooks"
                className="block p-4 bg-gray-50 rounded-xl border hover:border-blue-200 transition"
              >
                <Globe className="w-8 h-8 text-blue-500 mb-2" />
                <p className="font-medium text-sm">Manage Endpoints</p>
                <p className="text-xs text-gray-500 mt-1">Add, enable, and configure webhook endpoints</p>
              </a>
              <a
                href="/webhooks"
                className="block p-4 bg-gray-50 rounded-xl border hover:border-blue-200 transition"
              >
                <Activity className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="font-medium text-sm">Delivery Logs</p>
                <p className="text-xs text-gray-500 mt-1">View delivery status, retry and replay events</p>
              </a>
              <a
                href="/webhooks"
                className="block p-4 bg-gray-50 rounded-xl border hover:border-blue-200 transition"
              >
                <Terminal className="w-8 h-8 text-purple-500 mb-2" />
                <p className="font-medium text-sm">Test Console</p>
                <p className="text-xs text-gray-500 mt-1">Send test webhook events and inspect results</p>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "api-logs" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" /> API Request Logs
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchApiLogs}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <Select value={logMethodFilter} onChange={(e) => setLogMethodFilter(e.target.value)} className="w-28">
                <option value="ALL">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </Select>
              <Select value={logStatusFilter} onChange={(e) => setLogStatusFilter(e.target.value)} className="w-28">
                <option value="ALL">All Status</option>
                <option value="2xx">2xx Success</option>
                <option value="4xx">4xx Client Error</option>
                <option value="5xx">5xx Server Error</option>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by path or request ID..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiLogsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">No API logs recorded yet</TableCell></TableRow>
                ) : (
                  filteredLogs.slice(0, 50).map((log: any) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => { setSelectedLog(log); setShowLogDetail(true); }}
                    >
                      <TableCell>
                        <span className={`text-xs font-mono font-medium ${
                          log.method === "GET" ? "text-emerald-600" :
                          log.method === "POST" ? "text-blue-600" :
                          log.method === "PUT" ? "text-amber-600" :
                          log.method === "PATCH" ? "text-purple-600" :
                          log.method === "DELETE" ? "text-red-600" : ""
                        }`}>
                          {log.method}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono max-w-[200px] truncate">{log.path}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          log.status < 300 ? "bg-emerald-50 text-emerald-700" :
                          log.status < 500 ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-700"
                        }`}>
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{log.duration}ms</TableCell>
                      <TableCell className="text-xs font-mono text-gray-400">{log.id?.slice(0, 12)}...</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "checklist" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" /> Integration Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Track your integration progress. Each step links to the relevant documentation or page.
            </p>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:border-blue-200 transition cursor-pointer"
                  onClick={() => toggleChecklist(item.id)}
                >
                  <button className="shrink-0">
                    {item.done ? (
                      <CheckSquare className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300" />
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${item.done ? "line-through text-gray-400" : ""}`}>
                    {item.label}
                  </span>
                  {item.link && (
                    <a
                      href={item.link}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">{checklist.filter((i) => i.done).length}/{checklist.length} completed</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${(checklist.filter((i) => i.done).length / checklist.length) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "quickstart" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Step-by-Step Integration Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Create a Payment (Charge)
                </h3>
                <div className="mt-3 space-y-3">
                  <CodeSnippet
                    label="cURL"
                    code={`curl -X POST https://api.nexpay.com/v1/payments/charges \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: <unique_uuid>" \\
  -d '{
    "amount": 2500,
    "currency": "USD",
    "paymentMethod": "card",
    "customer": {
      "email": "customer@example.com"
    }
  }'`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                  <CodeSnippet
                    label="Node.js"
                    code={`const nexpay = require('nexpay-sdk')({ apiKey: '<your_api_key>' });

const charge = await nexpay.charges.create({
  amount: 2500,
  currency: 'USD',
  paymentMethod: 'card',
  customer: { email: 'customer@example.com' },
}, { idempotencyKey: '<unique_uuid>' });

console.log(charge.id, charge.status);`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                  <CodeSnippet
                    label="Python"
                    code={`import nexpay

client = nexpay.Client(api_key='<your_api_key>')
charge = client.charges.create(
    amount=2500,
    currency='USD',
    payment_method='card',
    customer={'email': 'customer@example.com'},
    idempotency_key='<unique_uuid>',
)
print(charge.id, charge.status)`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Handle Webhooks
                </h3>
                <div className="mt-3 space-y-3">
                  <CodeSnippet
                    label="Node.js (Express)"
                    code={`const crypto = require('crypto');

app.post('/webhooks/nexpay', (req, res) => {
  const sig = req.headers['x-nexpay-signature'];
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.NEXPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body.event;
  switch (event) {
    case 'payment.captured':
      // Handle successful payment
      break;
    case 'payment.failed':
      // Handle failed payment
      break;
  }

  res.status(200).send('OK');
});`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                  <CodeSnippet
                    label="Python (Flask)"
                    code={`import hmac, hashlib
from flask import request, jsonify

@app.route('/webhooks/nexpay', methods=['POST'])
def handle_webhook():
    sig = request.headers.get('x-nexpay-signature')
    payload = request.get_data()
    expected = hmac.new(
        SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(sig, expected):
        return 'Invalid signature', 401

    event = request.json['event']
    if event == 'payment.captured':
        # Handle successful payment
        pass

    return 'OK', 200`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Issue a Refund
                </h3>
                <div className="mt-3 space-y-3">
                  <CodeSnippet
                    label="cURL"
                    code={`curl -X POST https://api.nexpay.com/v1/payments/charges/<charge_id>/refund \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: <unique_uuid>" \\
  -d '{
    "amount": 2500,
    "reason": "customer_request"
  }'`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                  <CodeSnippet
                    label="Node.js"
                    code={`const refund = await nexpay.refunds.create({
  charge: '<charge_id>',
  amount: 2500,
  reason: 'customer_request',
}, { idempotencyKey: '<unique_uuid>' });

console.log('Refund:', refund.id, refund.status);`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  Using Idempotency
                </h3>
                <div className="mt-3">
                  <CodeSnippet
                    label="Concept"
                    code={`# Idempotency allows safe retries without duplicate charges.
# Include an Idempotency-Key header with a unique UUID.
# If the request succeeds but you don't get a response (timeout),
# retry with the same key — the API returns the original result.

# Key rules:
# - Keys expire after 24 hours
# - Each key is scoped to a merchant
# - Use UUID v4 for best results`}
                    copied={copied} onCopy={copyToClipboard}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateKeyModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateKeyModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Create API Key</h3>
              <button onClick={() => setShowCreateKeyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Key Name</label>
                <Input
                  placeholder="e.g. Production Server Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Environment</label>
                <Select value={newKeyEnv} onChange={(e) => setNewKeyEnv(e.target.value as any)}>
                  <option value="TEST">Test (Sandbox)</option>
                  <option value="LIVE">Live (Production)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Scopes</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {SCOPES.map((scope) => (
                    <label key={scope.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(scope.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyScopes([...newKeyScopes, scope.value]);
                          } else {
                            setNewKeyScopes(newKeyScopes.filter((s) => s !== scope.value));
                          }
                        }}
                        className="rounded"
                      />
                      {scope.label}
                      <code className="text-xs text-gray-400 ml-1">({scope.value})</code>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateKeyModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white" onClick={createApiKey}>
                  Create Key
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {showLogDetail && selectedLog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowLogDetail(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">API Request Detail</h2>
                <button onClick={() => setShowLogDetail(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Request ID</p>
                    <p className="text-sm font-mono break-all">{selectedLog.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Timestamp</p>
                    <p className="text-sm">{selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Method</p>
                    <p className="text-sm font-mono font-medium">{selectedLog.method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      selectedLog.status < 300 ? "bg-emerald-50 text-emerald-700" :
                      selectedLog.status < 500 ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    }`}>{selectedLog.status}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Path</p>
                    <p className="text-sm font-mono break-all">{selectedLog.path}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm">{selectedLog.duration}ms</p>
                  </div>
                </div>

                {selectedLog.requestBody && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Request Body</p>
                    <pre className="bg-gray-900 text-gray-100 text-xs font-mono p-4 rounded-xl overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.responseBody && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Response Body</p>
                    <pre className="bg-gray-50 border rounded-xl p-4 text-xs font-mono overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.responseBody, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CodeSnippet({ label, code, copied, onCopy }: {
  label: string;
  code: string;
  copied: string;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
          <Terminal className="w-3 h-3" /> {label}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white h-7"
          onClick={() => onCopy(code, `code-${label}`)}
        >
          {copied === `code-${label}` ? (
            <><Check className="w-3 h-3 mr-1" /> Copied</>
          ) : (
            <><Copy className="w-3 h-3 mr-1" /> Copy</>
          )}
        </Button>
      </div>
      <pre className="p-4 text-xs text-gray-100 font-mono overflow-auto max-h-64 leading-relaxed">{code}</pre>
    </div>
  );
}
