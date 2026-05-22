"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Copy, Check, Beaker, AlertTriangle, RefreshCw, Zap, CreditCard,
  Skull, Clock, Activity, Radio, Ban, Link2, Wallet, BookOpen,
  Database, Cpu, Trash2, Play,
} from "lucide-react";
import api from "@/lib/api";

const testCards = [
  { number: "4242 4242 4242 4242", scenario: "Success", label: "Payment succeeds", badge: "success" },
  { number: "4000 0000 0000 0002", scenario: "Decline", label: "Card declined", badge: "destructive" },
  { number: "4000 0000 0000 3220", scenario: "3DS Required", label: "3D Secure authentication required", badge: "warning" },
  { number: "4100 0000 0000 0019", scenario: "Fraud", label: "Fraud auto-decline", badge: "destructive" },
  { number: "4000 0025 0000 3155", scenario: "Insufficient Funds", label: "Insufficient balance", badge: "warning" },
  { number: "4000 0000 0000 0119", scenario: "Lost Card", label: "Card reported lost", badge: "destructive" },
  { number: "success@upi", scenario: "UPI Success", label: "UPI payment succeeds", badge: "success" },
  { number: "fail@upi", scenario: "UPI Fail", label: "UPI payment fails", badge: "destructive" },
];

const eventScenarios = [
  { event: "dispute_raised", description: "Customer initiates a dispute" },
  { event: "chargeback", description: "Bank files a chargeback" },
  { event: "payout_failure", description: "Settlement payout fails" },
];

const chaosScenarios = [
  { id: "provider_timeout", label: "Provider Timeout", icon: Clock, color: "text-orange-500" },
  { id: "provider_500", label: "Provider 500 Error", icon: AlertTriangle, color: "text-red-500" },
  { id: "duplicate_webhook", label: "Duplicate Webhook", icon: Copy, color: "text-purple-500" },
  { id: "delayed_webhook", label: "Delayed Webhook", icon: Radio, color: "text-blue-500" },
  { id: "payout_stuck", label: "Payout Stuck", icon: Ban, color: "text-red-600" },
  { id: "bank_mismatch", label: "Bank Mismatch", icon: Wallet, color: "text-yellow-500" },
  { id: "ledger_imbalance", label: "Ledger Imbalance", icon: BookOpen, color: "text-indigo-500" },
  { id: "redis_unavailable", label: "Redis Unavailable", icon: Database, color: "text-red-400" },
  { id: "worker_crash", label: "Worker Crash", icon: Cpu, color: "text-orange-600" },
];

const scenarioIcons: Record<string, { icon: any; color: string }> = {
  provider_timeout: { icon: Clock, color: "text-orange-500" },
  provider_500: { icon: AlertTriangle, color: "text-red-500" },
  duplicate_webhook: { icon: Copy, color: "text-purple-500" },
  delayed_webhook: { icon: Radio, color: "text-blue-500" },
  payout_stuck: { icon: Ban, color: "text-red-600" },
  bank_mismatch: { icon: Wallet, color: "text-yellow-500" },
  ledger_imbalance: { icon: BookOpen, color: "text-indigo-500" },
  redis_unavailable: { icon: Database, color: "text-red-400" },
  worker_crash: { icon: Cpu, color: "text-orange-600" },
};

interface ChaosRuleState {
  name: string;
  description: string;
  probability: number;
  enabled: boolean;
}

interface ChaosEventItem {
  id: string;
  rule: string;
  effect: { type: string; [key: string]: any };
  context: { paymentId: string; amount: number; currency: string };
  timestamp: string;
}

export default function SandboxPage() {
  const [tab, setTab] = useState<"test-cards" | "events" | "chaos">("test-cards");
  const [copiedCard, setCopiedCard] = useState("");
  const [simulating, setSimulating] = useState<string | null>(null);
  const [chaosRules, setChaosRules] = useState<ChaosRuleState[]>([]);
  const [chaosHistory, setChaosHistory] = useState<ChaosEventItem[]>([]);
  const [savingRule, setSavingRule] = useState(false);
  const [triggerScenario, setTriggerScenario] = useState("provider_timeout");
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<any>(null);
  const [simScenario, setSimScenario] = useState("provider_timeout");
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    fetchChaosRules();
    fetchChaosHistory();
  }, []);

  const fetchChaosRules = async () => {
    try {
      const res = await api.get<any>("/sandbox/chaos/rules");
      setChaosRules(res.data || []);
    } catch {
      console.error("Failed to fetch chaos rules");
    }
  };

  const fetchChaosHistory = async () => {
    try {
      const res = await api.get<any>("/sandbox/chaos/history");
      setChaosHistory(res.data || []);
    } catch {
      console.error("Failed to fetch chaos history");
    }
  };

  const toggleRule = async (name: string, enabled: boolean) => {
    setSavingRule(true);
    try {
      await api.post<any>("/sandbox/chaos/rules", { rules: [{ name, enabled }] });
      await fetchChaosRules();
    } catch {
      console.error("Failed to update rule");
    }
    setSavingRule(false);
  };

  const updateProbability = async (name: string, probability: number) => {
    setSavingRule(true);
    try {
      await api.post<any>("/sandbox/chaos/rules", { rules: [{ name, probability }] });
      await fetchChaosRules();
    } catch {
      console.error("Failed to update probability");
    }
    setSavingRule(false);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await api.post<any>("/sandbox/chaos/trigger", { scenario: triggerScenario });
      setTriggerResult(res);
      await fetchChaosHistory();
    } catch (err: any) {
      setTriggerResult({ error: err.message || "Trigger failed" });
    }
    setTriggering(false);
  };

  const handleSimulate = async () => {
    setSimResult(null);
    let endpoint = "";
    if (simScenario === "provider_timeout") endpoint = "/sandbox/simulate/provider-timeout";
    else if (simScenario === "provider_500") endpoint = "/sandbox/simulate/provider-error";
    else if (simScenario === "delayed_webhook") endpoint = "/sandbox/simulate/webhook-delay";

    try {
      const res = await api.post<any>(endpoint, {});
      setSimResult(res);
      await fetchChaosHistory();
    } catch (err: any) {
      setSimResult({ error: err.message || "Simulation failed" });
    }
  };

  const clearHistory = async () => {
    try {
      await api.delete("/sandbox/chaos/history");
      setChaosHistory([]);
    } catch {
      console.error("Failed to clear history");
    }
  };

  const copyCard = (num: string) => {
    navigator.clipboard.writeText(num.replace(/\s/g, ""));
    setCopiedCard(num);
    setTimeout(() => setCopiedCard(""), 2000);
  };

  const simulateEvent = async (event: string) => {
    setSimulating(event);
    try {
      await api.post<any>("/sandbox/events", { event });
    } catch (err) {
      console.error("Event simulation error:", err);
    }
    setSimulating(null);
  };

  const resetSandbox = async () => {
    try {
      await api.delete("/sandbox/reset");
      fetchChaosHistory();
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sandbox / Test Mode</h1>
          <p className="text-sm text-gray-500 mt-1">Test your integration with simulated data</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-medium text-amber-800">Sandbox Environment</span>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setTab("test-cards")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            tab === "test-cards" ? "bg-white border border-b-white text-blue-600 -mb-[3px]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-1" /> Test Cards
        </button>
        <button
          onClick={() => setTab("events")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            tab === "events" ? "bg-white border border-b-white text-blue-600 -mb-[3px]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Zap className="w-4 h-4 inline mr-1" /> Event Simulator
        </button>
        <button
          onClick={() => setTab("chaos")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            tab === "chaos" ? "bg-white border border-b-white text-blue-600 -mb-[3px]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Skull className="w-4 h-4 inline mr-1" /> Chaos Engineering
        </button>
      </div>

      {tab === "test-cards" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Test Card Numbers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testCards.map((card) => (
                  <div
                    key={card.number}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:border-blue-200 transition group"
                  >
                    <div>
                      <p className="text-sm font-mono font-medium">{card.number}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={card.badge as any}>{card.scenario}</Badge>
                        <span className="text-xs text-gray-500">{card.label}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCard(card.number)}
                      className="opacity-0 group-hover:opacity-100 transition"
                    >
                      {copiedCard === card.number ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" /> Sandbox Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Isolated test environment</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Sandbox data is completely separate from your live data. No real money is moved.
                      Test webhooks hit sandbox endpoints only.
                    </p>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={resetSandbox}>
                <RefreshCw className="w-4 h-4 mr-1" /> Reset All Sandbox Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "events" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" /> Event Simulator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Trigger test scenarios to validate your webhook handlers end-to-end.
            </p>
            <div className="space-y-2">
              {eventScenarios.map((ev) => (
                <button
                  key={ev.event}
                  onClick={() => simulateEvent(ev.event)}
                  disabled={simulating !== null}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:border-blue-200 transition text-left"
                >
                  <div>
                    <code className="text-sm font-mono text-blue-600">{ev.event}</code>
                    <p className="text-xs text-gray-500">{ev.description}</p>
                  </div>
                  {simulating === ev.event ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  ) : (
                    <Zap className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "chaos" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skull className="w-5 h-5" /> Chaos Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Configure chaos engineering rules. Each rule has a probability of being triggered during sandbox operations.
              </p>
              <div className="space-y-3">
                {chaosRules.map((rule) => {
                  const meta = chaosScenarios.find((s) => s.id === rule.name);
                  const Icon = meta?.icon || Skull;
                  return (
                    <div key={rule.name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
                      <Icon className={`w-5 h-5 ${meta?.color || "text-gray-400"} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rule.name.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-500 truncate">{rule.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Prob:</span>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={rule.probability}
                            onChange={(e) => updateProbability(rule.name, parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 text-xs"
                            disabled={savingRule}
                          />
                        </div>
                        <button
                          onClick={() => toggleRule(rule.name, !rule.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            rule.enabled ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              rule.enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" /> Manual Trigger
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Manually trigger a specific chaos scenario to test your system&apos;s resilience.
                </p>
                <div className="flex gap-2">
                  <Select
                    value={triggerScenario}
                    onChange={(e) => setTriggerScenario(e.target.value)}
                    options={chaosScenarios.map((s) => ({ value: s.id, label: s.label }))}
                    className="flex-1"
                  />
                  <Button onClick={handleTrigger} disabled={triggering}>
                    {triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Trigger
                  </Button>
                </div>
                {triggerResult && (
                  <div className="bg-gray-50 border rounded-lg p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">
                      {JSON.stringify(triggerResult, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="w-5 h-5" /> Simulate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Simulate common failure scenarios directly.
                </p>
                <div className="flex gap-2">
                  <Select
                    value={simScenario}
                    onChange={(e) => setSimScenario(e.target.value)}
                    options={[
                      { value: "provider_timeout", label: "Provider Timeout" },
                      { value: "provider_500", label: "Provider 500 Error" },
                      { value: "delayed_webhook", label: "Delayed Webhook" },
                    ]}
                    className="flex-1"
                  />
                  <Button onClick={handleSimulate} variant="secondary">
                    <Play className="w-4 h-4" /> Send Test
                  </Button>
                </div>
                {simResult && (
                  <div className="bg-gray-50 border rounded-lg p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">
                      {JSON.stringify(simResult, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" /> Chaos Event History
                <Button variant="ghost" size="sm" onClick={clearHistory} className="ml-auto text-red-500">
                  <Trash2 className="w-4 h-4 mr-1" /> Clear
                </Button>
                <Button variant="ghost" size="sm" onClick={fetchChaosHistory}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chaosHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No chaos events recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Effect</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chaosHistory.slice(0, 20).map((event) => {
                      const effectType = event.effect?.type || "none";
                      const meta = scenarioIcons[effectType] || { icon: Skull, color: "text-gray-400" };
                      const Icon = meta.icon;
                      return (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${meta.color}`} />
                              <span className="text-sm font-medium">{event.rule}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {effectType}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-500">
                              {event.context?.paymentId?.slice(0, 12)}...
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
