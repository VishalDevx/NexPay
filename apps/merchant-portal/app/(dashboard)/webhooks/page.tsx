"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Globe, Webhook, Play, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  Eye, EyeOff, RefreshCw, RotateCcw, X, Plus, ChevronDown, ChevronUp,
  AlertTriangle, Clock, Terminal, Settings, Search, Filter, Activity,
} from "lucide-react";
import api from "@/lib/api";

const AVAILABLE_EVENTS = [
  "payment.created", "payment.captured", "payment.failed", "payment.refunded",
  "dispute.created", "dispute.resolved", "payout.paid", "payout.failed",
];

const TEST_EVENTS = [
  { value: "payment.captured", label: "Payment Captured" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "payment.refunded", label: "Payment Refunded" },
  { value: "dispute.created", label: "Dispute Created" },
  { value: "dispute.resolved", label: "Dispute Resolved" },
  { value: "payout.paid", label: "Payout Paid" },
  { value: "payout.failed", label: "Payout Failed" },
];

const STATUS_BADGE_MAP: Record<string, string> = {
  DELIVERED: "success",
  FAILED: "destructive",
  PENDING: "warning",
  DEAD_LETTER: "neutral",
};

export default function WebhooksPage() {
  const [activeSection, setActiveSection] = useState("endpoints");
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>(["payment.captured"]);

  const [showTestModal, setShowTestModal] = useState(false);
  const [testEventType, setTestEventType] = useState("payment.captured");
  const [testPayload, setTestPayload] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testSending, setTestSending] = useState(false);

  const [copied, setCopied] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set());

  const [deliveryFilter, setDeliveryFilter] = useState("ALL");
  const [deliveryEventFilter, setDeliveryEventFilter] = useState("ALL");
  const [deliverySearch, setDeliverySearch] = useState("");

  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [showSlideOver, setShowSlideOver] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [epRes, delRes] = await Promise.all([
        api.get<any>("/merchants/webhooks"),
        api.get<any>("/merchants/webhooks/deliveries"),
      ]);
      setEndpoints(epRes.data || []);
      setDeliveries(delRes.data || []);
    } catch (err) {
      console.error("Webhook fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const createEndpoint = async () => {
    try {
      const res = await api.post<any>("/merchants/webhooks", { url: newUrl, events: newEvents });
      const secret = res.endpoint?.secret || res.secret;
      if (secret) {
        setCopied(secret);
        navigator.clipboard.writeText(secret);
        setTimeout(() => setCopied(""), 3000);
      }
      setShowAddForm(false);
      setNewUrl("");
      setNewEvents(["payment.captured"]);
      await fetchData();
    } catch (err) {
      console.error("Create endpoint error:", err);
    }
  };

  const deleteEndpoint = async (id: string) => {
    try {
      await api.delete("/merchants/webhooks/" + id);
      await fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const toggleEndpoint = async (id: string, current: boolean) => {
    try {
      await api.patch("/merchants/webhooks/" + id, { enabled: !current });
      setEndpoints((prev) => prev.map((ep) => ep.id === id ? { ...ep, enabled: !current } : ep));
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const rotateSecret = async (id: string) => {
    try {
      const res = await api.post<any>("/merchants/webhooks/" + id + "/rotate-secret");
      setCopied(res.secret);
      navigator.clipboard.writeText(res.secret);
      setTimeout(() => setCopied(""), 3000);
    } catch (err) {
      console.error("Rotate error:", err);
    }
  };

  const replayDelivery = async (id: string) => {
    try {
      await api.post("/merchants/webhooks/deliveries/" + id + "/replay");
      await fetchData();
    } catch (err) {
      console.error("Replay error:", err);
    }
  };

  const retryDelivery = async (id: string) => {
    try {
      await api.post("/merchants/webhooks/deliveries/" + id + "/retry");
      await fetchData();
    } catch (err) {
      console.error("Retry error:", err);
    }
  };

  const sendTestEvent = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      let parsedPayload: any = undefined;
      if (testPayload.trim()) {
        try {
          parsedPayload = JSON.parse(testPayload);
        } catch {
          setTestResult({ error: "Invalid JSON payload" });
          setTestSending(false);
          return;
        }
      }
      const res = await api.post<any>("/sandbox/trigger-webhook", {
        eventType: testEventType,
        payload: parsedPayload,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message || "Request failed" });
    } finally {
      setTestSending(false);
    }
  };

  const viewDeliveryDetail = async (d: any) => {
    try {
      const res = await api.get<any>("/merchants/webhooks/deliveries/" + d.id);
      setSelectedDelivery(res.data || d);
      setShowSlideOver(true);
    } catch {
      setSelectedDelivery(d);
      setShowSlideOver(true);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedDeliveries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (deliveryFilter !== "ALL" && d.status !== deliveryFilter) return false;
    if (deliveryEventFilter !== "ALL" && (d.payload?.event !== deliveryEventFilter)) return false;
    if (deliverySearch) {
      const q = deliverySearch.toLowerCase();
      const event = (d.payload?.event || "").toLowerCase();
      const endpointUrl = d.endpoint?.url || d.endpointUrl || "";
      if (!event.includes(q) && !endpointUrl.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sections = [
    { id: "endpoints", label: "Endpoints", icon: Globe },
    { id: "deliveries", label: "Deliveries", icon: Webhook },
    { id: "testing", label: "Testing Console", icon: Terminal },
    { id: "logs", label: "Logs", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage webhook endpoints, view delivery logs, and test your integration</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowTestModal(true)} variant="outline">
            <Play className="w-4 h-4 mr-1" /> Send Test Event
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-500 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Endpoint
          </Button>
        </div>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                activeSection === s.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {activeSection === "endpoints" && (
        <div className="space-y-4">
          {endpoints.length === 0 && !showAddForm && (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No webhook endpoints configured</p>
                <p className="text-gray-400 text-xs mt-1">Add an endpoint to start receiving webhook events</p>
                <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Endpoint
                </Button>
              </CardContent>
            </Card>
          )}

          {endpoints.map((ep) => (
            <Card key={ep.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleEndpoint(ep.id, ep.enabled)}
                        className={ep.enabled ? "text-emerald-500" : "text-gray-300"}
                      >
                        {ep.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <div>
                        <p className="text-sm font-medium">{ep.url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={ep.enabled ? "success" : "neutral"} className="text-[10px]">
                            {ep.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Created {new Date(ep.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(ep.events || []).map((e: string) => (
                        <Badge key={e} variant="info" className="text-[10px]">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const revealed = revealedSecrets.has(ep.id);
                        if (!revealed) {
                          rotateSecret(ep.id);
                        }
                        setRevealedSecrets((prev) => {
                          const next = new Set(prev);
                          if (next.has(ep.id)) next.delete(ep.id);
                          else next.add(ep.id);
                          return next;
                        });
                      }}
                      title={revealedSecrets.has(ep.id) ? "Hide secret" : "Reveal secret"}
                    >
                      {revealedSecrets.has(ep.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => rotateSecret(ep.id)} title="Rotate secret">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteEndpoint(ep.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {showAddForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add Webhook Endpoint</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Endpoint URL</label>
                  <Input
                    placeholder="https://api.your-app.com/webhooks/nexpay"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Subscribe to events</p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_EVENTS.map((ev) => (
                      <button
                        key={ev}
                        onClick={() => setNewEvents(
                          newEvents.includes(ev)
                            ? newEvents.filter((e) => e !== ev)
                            : [...newEvents, ev]
                        )}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          newEvents.includes(ev)
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={createEndpoint} disabled={!newUrl}>
                    Create Endpoint
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeSection === "deliveries" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} className="w-32">
                <option value="ALL">All Status</option>
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
                <option value="DEAD_LETTER">Dead Letter</option>
              </Select>
              <Select value={deliveryEventFilter} onChange={(e) => setDeliveryEventFilter(e.target.value)} className="w-40">
                <option value="ALL">All Events</option>
                {AVAILABLE_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search event or endpoint..."
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
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
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredDeliveries.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">No deliveries found</TableCell></TableRow>
                ) : (
                  filteredDeliveries.slice(0, 20).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm font-medium">{d.payload?.event || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={(STATUS_BADGE_MAP[d.status] || "neutral") as any}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{d.attempts}/{d.maxRetries}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-mono ${d.httpStatus >= 400 ? "text-red-500" : "text-emerald-500"}`}>
                          {d.httpStatus || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{d.latency ? `${d.latency}ms` : "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[120px] truncate">
                        {d.endpoint?.url || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDeliveryDetail(d)} title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {d.status === "FAILED" && (
                            <Button variant="ghost" size="sm" onClick={() => retryDelivery(d.id)} title="Retry">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => replayDelivery(d.id)} title="Replay">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeSection === "testing" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Send Test Event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <Select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value)}
                  options={TEST_EVENTS}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Custom Payload (JSON) <span className="text-gray-400 font-normal">— optional</span>
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  rows={8}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder={'{\n  "amount": 2500,\n  "currency": "USD",\n  "status": "CAPTURED"\n}'}
                />
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-500 text-white w-full"
                onClick={sendTestEvent}
                disabled={testSending}
              >
                {testSending ? (
                  <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Sending...</>
                ) : (
                  <><Play className="w-4 h-4 mr-1" /> Send Test Event</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" /> Delivery Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!testResult ? (
                <div className="text-center py-12">
                  <Terminal className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">Send a test event to see the result here</p>
                </div>
              ) : testResult.error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-xs text-red-600 mt-1">{testResult.error}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Event Dispatched</p>
                        <p className="text-xs text-emerald-600 mt-1">
                          {testResult.matchedEndpoints || 0} of {testResult.endpointCount || 0} endpoints matched
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Event Summary</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Event:</span> <span className="font-medium">{testResult.eventType}</span></div>
                      <div><span className="text-gray-500">Payment:</span> <code className="text-xs">{testResult.paymentId?.slice(0, 12)}...</code></div>
                      <div><span className="text-gray-500">Endpoints:</span> <span className="font-medium">{testResult.matchedEndpoints} delivered</span></div>
                      <div><span className="text-gray-500">Timing:</span> <span className="font-medium">{testResult.timing?.startTime ? new Date(testResult.timing.startTime).toLocaleTimeString() : "—"}</span></div>
                    </div>
                  </div>

                  {testResult.deliveries && testResult.deliveries.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Delivery Details</p>
                      {testResult.deliveries.map((del: any, i: number) => (
                        <div key={i} className="bg-gray-50 border rounded-lg p-3 mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={(STATUS_BADGE_MAP[del.status] || "neutral") as any} className="text-[10px]">
                                {del.status}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {del.httpStatus ? `HTTP ${del.httpStatus}` : "Pending..."}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{del.attempts} attempts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <pre className="bg-gray-900 text-gray-100 text-xs font-mono p-4 rounded-xl overflow-auto max-h-48">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === "logs" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Webhook Logs
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">No webhook logs found</TableCell></TableRow>
                ) : (
                  filteredDeliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm font-medium">{d.payload?.event || "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[160px] truncate">
                        {d.endpoint?.url || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={(STATUS_BADGE_MAP[d.status] || "neutral") as any}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{d.attempts}/{d.maxRetries}</TableCell>
                      <TableCell className="text-xs text-gray-500">{d.latency ? `${d.latency}ms` : "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDeliveryDetail(d)} title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(d.payload, null, 2), `payload-${d.id}`)}
                            title="Copy payload"
                          >
                            {copied === `payload-${d.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeSection === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Retry Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border">
                <p className="text-sm font-medium">Max Retries</p>
                <p className="text-2xl font-bold mt-1">5</p>
                <p className="text-xs text-gray-500 mt-1">Maximum number of delivery attempts before moving to dead letter</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border">
                <p className="text-sm font-medium">Retry Delay</p>
                <p className="text-2xl font-bold mt-1">Exponential</p>
                <p className="text-xs text-gray-500 mt-1">Base delay: 1s · Backoff factor: 2x</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border">
                <p className="text-sm font-medium">Dead Letter Queue</p>
                <p className="text-2xl font-bold mt-1">Enabled</p>
                <p className="text-xs text-gray-500 mt-1">Deliveries move to dead letter after 5 failed attempts</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Version</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border">
                <p className="text-sm font-medium">Current Version</p>
                <p className="text-2xl font-bold mt-1">v1</p>
                <p className="text-xs text-gray-500 mt-1">Webhook payload format version</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Signing Secret</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Rotate your signing secret immediately if you suspect it has been compromised.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showSlideOver && selectedDelivery && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSlideOver(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Delivery Detail</h2>
                <button onClick={() => setShowSlideOver(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Delivery ID</p>
                    <p className="text-sm font-mono break-all">{selectedDelivery.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge variant={(STATUS_BADGE_MAP[selectedDelivery.status] || "neutral") as any}>
                      {selectedDelivery.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Event</p>
                    <p className="text-sm font-medium">{selectedDelivery.payload?.event || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Attempts</p>
                    <p className="text-sm">{selectedDelivery.attempts}/{selectedDelivery.maxRetries}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">HTTP Status</p>
                    <p className="text-sm font-mono">{selectedDelivery.httpStatus || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Latency</p>
                    <p className="text-sm">{selectedDelivery.latency ? `${selectedDelivery.latency}ms` : "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Endpoint URL</p>
                    <p className="text-sm break-all">{selectedDelivery.endpoint?.url || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Payload</p>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 text-xs font-mono p-4 rounded-xl overflow-auto max-h-64">
                      {JSON.stringify(selectedDelivery.payload, null, 2)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      onClick={() => copyToClipboard(JSON.stringify(selectedDelivery.payload, null, 2), "detail-payload")}
                    >
                      {copied === "detail-payload" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Response</p>
                  <pre className="bg-gray-50 border rounded-xl p-4 text-xs font-mono overflow-auto max-h-32">
                    {selectedDelivery.responseBody
                      ? JSON.stringify(selectedDelivery.responseBody, null, 2)
                      : "No response recorded"}
                  </pre>
                </div>

                <div className="flex gap-2 pt-2">
                  {(selectedDelivery.status === "FAILED" || selectedDelivery.status === "DEAD_LETTER") && (
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                      onClick={() => retryDelivery(selectedDelivery.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" /> Retry
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => replayDelivery(selectedDelivery.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> Replay
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showTestModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setShowTestModal(false); setTestResult(null); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Send Test Event</h3>
              <button onClick={() => { setShowTestModal(false); setTestResult(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <Select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value)}
                  options={TEST_EVENTS}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Custom Payload (JSON) <span className="text-gray-400 font-normal">— optional</span>
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  rows={6}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder={'{\n  "amount": 2500,\n  "currency": "USD"\n}'}
                />
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-500 text-white w-full"
                onClick={sendTestEvent}
                disabled={testSending}
              >
                {testSending ? (
                  <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Sending...</>
                ) : (
                  <><Play className="w-4 h-4 mr-1" /> Send</>
                )}
              </Button>

              {testResult && (
                <div className={`border rounded-xl p-4 ${testResult.error ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                  {testResult.error ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Error</p>
                        <p className="text-xs text-red-600">{testResult.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-800">Event dispatched successfully</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="text-emerald-700">Matched endpoints: {testResult.matchedEndpoints}</span>
                        <span className="text-emerald-700">Payment ID: {testResult.paymentId?.slice(0, 12)}...</span>
                      </div>
                    </div>
                  )}
                  <pre className="mt-3 bg-gray-900 text-gray-100 text-xs font-mono p-3 rounded-lg overflow-auto max-h-32">
                    {JSON.stringify(testResult.error ? testResult : testResult.deliveries, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
