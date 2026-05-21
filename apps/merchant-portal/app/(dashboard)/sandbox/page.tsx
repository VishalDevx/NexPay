"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Beaker, AlertTriangle, RefreshCw, Zap, CreditCard, Code } from "lucide-react";
import api from "@/lib/api";

const testCards = [
  { number: "4242 4242 4242 4242", scenario: "Success", label: "Payment succeeds", badge: "success" },
  { number: "4000 0000 0000 0002", scenario: "Decline", label: "Card declined", badge: "destructive" },
  { number: "4000 0000 0000 3220", scenario: "3DS Required", label: "3D Secure authentication required", badge: "warning" },
  { number: "4100 0000 0000 0019", scenario: "Fraud", label: "Fraud auto-decline", badge: "destructive" },
  { number: "4000 0025 0000 3155", scenario: "Insufficient Funds", label: "Insufficient balance", badge: "warning" },
  { number: "4000 0000 0000 0119", scenario: "Lost Card", label: "Card reported lost", badge: "destructive" },
];

const eventScenarios = [
  { event: "dispute.raised", description: "Customer initiates a dispute" },
  { event: "chargeback.received", description: "Bank files a chargeback" },
  { event: "payout.failed", description: "Settlement payout fails" },
  { event: "payment.failed", description: "Payment processing failure" },
  { event: "refund.processed", description: "Refund completed" },
];

export default function SandboxPage() {
  const [copiedCard, setCopiedCard] = useState("");
  const [simulating, setSimulating] = useState<string | null>(null);

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
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-mono font-medium">{card.number}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={card.badge as any}>{card.scenario}</Badge>
                        <span className="text-xs text-gray-500">{card.label}</span>
                      </div>
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

        <div className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Sandbox Controls
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
      </div>
    </div>
  );
}
