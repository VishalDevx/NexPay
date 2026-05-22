"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import {
  Activity, Clock, Server, Database, Globe, Zap, DollarSign, Webhook, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, Play, BarChart3, ChevronDown,
} from "lucide-react";

type TimeRange = "1h" | "6h" | "24h" | "7d";

export default function ObservabilityPage() {
  const [token, setToken] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({ counters: {}, histograms: {}, gauges: {} });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const [outboxPending, setOutboxPending] = useState(0);
  const [outboxFailed, setOutboxFailed] = useState<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";

  useEffect(() => {
    const t = localStorage.getItem("nexpay_admin_token");
    if (t) setToken(t);
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/metrics`, {
        headers: { Authorization: `Bearer ${token}`, "x-api-key": token || "" },
      });
      if (res.ok) {
        const d = await res.json();
        setMetrics(d);
      }
    } catch {}
  }, [token, API]);

  const fetchOutbox = useCallback(async () => {
    try {
      const [pendingRes, failedRes] = await Promise.all([
        fetch(`${API}/api/v1/admin/outbox/pending`, {
          headers: { Authorization: `Bearer ${token}`, "x-api-key": token || "" },
        }),
        fetch(`${API}/api/v1/admin/outbox/failed`, {
          headers: { Authorization: `Bearer ${token}`, "x-api-key": token || "" },
        }),
      ]);
      if (pendingRes.ok) {
        const pd = await pendingRes.json();
        setOutboxPending(pd.count || 0);
      }
      if (failedRes.ok) {
        const fd = await failedRes.json();
        setOutboxFailed(fd.data || []);
      }
    } catch {}
  }, [token, API]);

  useEffect(() => {
    if (!token) return;
    fetchMetrics();
    fetchOutbox();
  }, [token, fetchMetrics, fetchOutbox]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh && token) {
      intervalRef.current = setInterval(() => {
        fetchMetrics();
        fetchOutbox();
      }, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, token, fetchMetrics, fetchOutbox]);

  const processOutboxManually = async () => {
    try {
      await fetch(`${API}/api/v1/admin/outbox/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "x-api-key": token || "" },
      });
      fetchOutbox();
    } catch {}
  };

  const retryFailed = async (id: string) => {
    try {
      await fetch(`${API}/api/v1/admin/outbox/${id}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "x-api-key": token || "" },
      });
      fetchOutbox();
    } catch {}
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center max-w-sm w-full">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Activity size={24} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Observability</h2>
          <p className="text-sm text-gray-400">Please sign in from the main admin page first.</p>
        </div>
      </div>
    );
  }

  const counters = metrics?.counters || {};
  const histograms = metrics?.histograms || {};
  const gauges = metrics?.gauges || {};

  const apiRequestsTotal = Object.entries(counters)
    .filter(([k]) => k.startsWith("api_requests_total"))
    .reduce((sum, [, v]) => sum + (v as number), 0);

  const paymentSuccess = Object.entries(counters)
    .filter(([k]) => k.startsWith("payment_success_total"))
    .reduce((sum, [, v]) => sum + (v as number), 0);

  const paymentFailure = Object.entries(counters)
    .filter(([k]) => k.startsWith("payment_failure_total"))
    .reduce((sum, [, v]) => sum + (v as number), 0);

  const webhookDeliveries = Object.entries(counters)
    .filter(([k]) => k.startsWith("webhook_delivery_total"))
    .reduce((sum, [, v]) => sum + (v as number), 0);

  const fraudDeclines = counters["fraud_decline_total"] || 0;
  const payoutTotal = Object.entries(counters)
    .filter(([k]) => k.startsWith("payout_total"))
    .reduce((sum, [, v]) => sum + (v as number), 0);

  const reconMismatches = Object.entries(counters)
    .filter(([k]) => k.startsWith("reconciliation_mismatch_total"))
    .reduce((sum, [, v]) => sum + (v as number), 0);

  const dbConnections = gauges["db_connections"] || 0;
  const redisConnected = gauges["redis_connected"] || 0;
  const webhookDlqSize = gauges["webhook_dlq_size"] || 0;
  const errorRate = gauges["error_rate"] || 0;

  const latencyHistogram = Object.entries(histograms)
    .filter(([k]) => k.startsWith("api_request_duration_ms"))[0];
  const latencyData = latencyHistogram ? latencyHistogram[1] : { p50: 0, p95: 0, p99: 0, count: 0, sum: 0 };

  const requestRateData = [
    { name: "GET", value: Object.entries(counters).filter(([k]) => k.includes("method=GET")).reduce((s, [, v]) => s + (v as number), 0) },
    { name: "POST", value: Object.entries(counters).filter(([k]) => k.includes("method=POST")).reduce((s, [, v]) => s + (v as number), 0) },
    { name: "PATCH", value: Object.entries(counters).filter(([k]) => k.includes("method=PATCH")).reduce((s, [, v]) => s + (v as number), 0) },
    { name: "DELETE", value: Object.entries(counters).filter(([k]) => k.includes("method=DELETE")).reduce((s, [, v]) => s + (v as number), 0) },
  ];

  const statusCodes = Object.entries(counters)
    .filter(([k]) => k.startsWith("api_requests_total") && k.includes("status_code="))
    .map(([k, v]) => {
      const m = k.match(/status_code=(\d+)/);
      return { name: m ? m[1] : "unknown", value: v as number };
    });

  const chartData = [
    { time: "Now", p50: latencyData.p50, p95: latencyData.p95, p99: latencyData.p99, requests: apiRequestsTotal },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">NexPay — Observability</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                autoRefresh
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700 text-gray-300 hover:bg-slate-600"
              }`}
            >
              <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
              {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            </button>
            <button
              onClick={() => { fetchMetrics(); fetchOutbox(); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-colors"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatusCard icon={Server} label="API Status" value="Running" color="emerald" />
          <StatusCard icon={Database} label="DB Conn." value={String(dbConnections)} color={dbConnections > 0 ? "emerald" : "red"} />
          <StatusCard icon={Globe} label="Redis" value={redisConnected ? "Connected" : "Disconnected"} color={redisConnected ? "emerald" : "red"} />
          <StatusCard icon={BarChart3} label="Req Total" value={String(apiRequestsTotal)} color="blue" />
          <StatusCard icon={AlertTriangle} label="Error Rate" value={`${errorRate}%`} color={errorRate > 5 ? "red" : errorRate > 1 ? "amber" : "emerald"} />
          <StatusCard icon={Zap} label="Webhook DLQ" value={String(webhookDlqSize)} color={webhookDlqSize > 0 ? "red" : "emerald"} />
          <StatusCard icon={Activity} label="Outbox Pend." value={String(outboxPending)} color={outboxPending > 0 ? "amber" : "emerald"} />
          <StatusCard icon={Activity} label="Outbox Fail." value={String(outboxFailed.length)} color={outboxFailed.length > 0 ? "red" : "emerald"} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2"><Clock size={16} /> API Latency (ms)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  <Line type="monotone" dataKey="p50" stroke="#22c55e" name="P50" strokeWidth={2} />
                  <Line type="monotone" dataKey="p95" stroke="#eab308" name="P95" strokeWidth={2} />
                  <Line type="monotone" dataKey="p99" stroke="#ef4444" name="P99" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">P50</p>
                <p className="text-lg font-bold text-emerald-400">{latencyData.p50.toFixed(1)}ms</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">P95</p>
                <p className="text-lg font-bold text-amber-400">{latencyData.p95.toFixed(1)}ms</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">P99</p>
                <p className="text-lg font-bold text-red-400">{latencyData.p99.toFixed(1)}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2"><BarChart3 size={16} /> Request Rate by Method</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><CheckCircle size={16} /> Payment Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Success</span>
                  <span className="text-emerald-400 font-medium">{paymentSuccess}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${paymentSuccess + paymentFailure > 0 ? (paymentSuccess / (paymentSuccess + paymentFailure)) * 100 : 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Failure</span>
                  <span className="text-red-400 font-medium">{paymentFailure}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${paymentSuccess + paymentFailure > 0 ? (paymentFailure / (paymentSuccess + paymentFailure)) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Fraud Declines</p>
                  <p className="text-lg font-bold text-orange-400">{fraudDeclines}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Payouts (Total)</p>
                  <p className="text-lg font-bold text-blue-400">{payoutTotal}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><Webhook size={16} /> Webhook & Queue Health</h3>
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Deliveries</span>
                <span className="text-white font-bold">{webhookDeliveries}</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">DLQ Size</span>
                <span className={`font-bold ${webhookDlqSize > 0 ? "text-red-400" : "text-emerald-400"}`}>{webhookDlqSize}</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Webhook Success Rate</span>
                <span className="text-emerald-400 font-bold">
                  {webhookDeliveries > 0
                    ? `${((Object.entries(counters).filter(([k]) => k.startsWith("webhook_delivery_total") && k.includes("status=DELIVERED")).reduce((s, [, v]) => s + (v as number), 0) / webhookDeliveries) * 100).toFixed(0)}%`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><AlertTriangle size={16} /> Anomalies</h3>
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Recon Mismatches</span>
                <span className={`font-bold ${reconMismatches > 0 ? "text-red-400" : "text-emerald-400"}`}>{reconMismatches}</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Payout Failures</span>
                <span className={`font-bold ${(Object.entries(counters).filter(([k]) => k.startsWith("payout_failure_total")).reduce((s, [, v]) => s + (v as number), 0)) > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {Object.entries(counters).filter(([k]) => k.startsWith("payout_failure_total")).reduce((s, [, v]) => s + (v as number), 0)}
                </span>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Error Rate</span>
                <span className={`font-bold ${errorRate > 5 ? "text-red-400" : errorRate > 1 ? "text-amber-400" : "text-emerald-400"}`}>{errorRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Code Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><BarChart3 size={16} /> Status Code Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCodes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusCodes.map((entry, idx) => (
                      <rect key={idx} fill={entry.name.startsWith("2") ? "#22c55e" : entry.name.startsWith("4") ? "#eab308" : entry.name.startsWith("5") ? "#ef4444" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><Activity size={16} /> Outbox & Worker Status</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Pending Events</p>
                  <p className="text-lg font-bold text-amber-400">{outboxPending}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Failed Events</p>
                  <p className="text-lg font-bold text-red-400">{outboxFailed.length}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={processOutboxManually}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-colors"
                >
                  <Play size={12} /> Process Outbox
                </button>
                <button
                  onClick={fetchOutbox}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-xs transition-colors"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {outboxFailed.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Failed Events</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {outboxFailed.map((ev: any) => (
                      <div key={ev.id} className="bg-slate-900 border border-slate-700 rounded-lg p-2 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-300 truncate">{ev.eventType} — {ev.aggregateId?.slice(0, 12)}</p>
                          <p className="text-xs text-gray-500">{ev.lastError?.slice(0, 60)}</p>
                        </div>
                        <button
                          onClick={() => retryFailed(ev.id)}
                          className="ml-2 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs flex-shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Worker Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><Server size={16} /> Worker Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <WorkerBadge name="Webhook" status="running" />
            <WorkerBadge name="Payout" status="running" />
            <WorkerBadge name="Outbox" status="running" />
            <WorkerBadge name="Reconciliation" status={gauges["worker_status{worker_name=reconciliation}"] ? "running" : "idle"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-900/20 border-emerald-800",
    red: "text-red-400 bg-red-900/20 border-red-800",
    amber: "text-amber-400 bg-amber-900/20 border-amber-800",
    blue: "text-blue-400 bg-blue-900/20 border-blue-800",
  };
  return (
    <div className={`${colors[color] || colors.blue} border rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} />
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function WorkerBadge({ name, status }: { name: string; status: string }) {
  const colors: Record<string, string> = {
    running: "bg-emerald-900/30 text-emerald-400 border-emerald-700",
    idle: "bg-slate-700 text-slate-400 border-slate-600",
    stopped: "bg-red-900/30 text-red-400 border-red-700",
  };
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
      <span className="text-sm text-gray-300">{name}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[status] || colors.idle}`}>
        {status}
      </span>
    </div>
  );
}
