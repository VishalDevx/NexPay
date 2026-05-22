"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle, XCircle, AlertTriangle, Wrench, ChevronDown, ChevronRight,
  ExternalLink, Clock, Mail, Bell, Rss, ArrowRight, Check,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";

type ComponentStatus = "operational" | "degraded" | "major_outage" | "maintenance";

interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatus;
  uptime: number;
  description: string;
}

interface IncidentUpdate {
  id: string;
  message: string;
  status: string;
  createdAt: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  status: string;
  affectedServices: string[];
  createdAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdate[];
}

interface UptimeEntry {
  date: string;
  uptime: number;
}

function statusColor(status: ComponentStatus): string {
  switch (status) {
    case "operational": return "bg-emerald-500";
    case "degraded": return "bg-amber-500";
    case "major_outage": return "bg-red-500";
    case "maintenance": return "bg-blue-500";
  }
}

function statusBgColor(status: ComponentStatus): string {
  switch (status) {
    case "operational": return "bg-emerald-500/10 border-emerald-500/20";
    case "degraded": return "bg-amber-500/10 border-amber-500/20";
    case "major_outage": return "bg-red-500/10 border-red-500/20";
    case "maintenance": return "bg-blue-500/10 border-blue-500/20";
  }
}

function statusTextColor(status: ComponentStatus): string {
  switch (status) {
    case "operational": return "text-emerald-400";
    case "degraded": return "text-amber-400";
    case "major_outage": return "text-red-400";
    case "maintenance": return "text-blue-400";
  }
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "SEV1": return "bg-red-900/50 text-red-400 border-red-700";
    case "SEV2": return "bg-orange-900/50 text-orange-400 border-orange-700";
    case "SEV3": return "bg-yellow-900/50 text-yellow-400 border-yellow-700";
    default: return "bg-slate-700 text-slate-300";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "INVESTIGATING": return "bg-blue-900/50 text-blue-400";
    case "MITIGATING": return "bg-orange-900/50 text-orange-400";
    case "RESOLVED": return "bg-emerald-900/50 text-emerald-400";
    case "MAINTENANCE": return "bg-blue-900/50 text-blue-400";
    default: return "bg-slate-700 text-slate-300";
  }
}

function IncidentDetail({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded font-medium border ${severityBadgeClass(incident.severity)}`}>
                {incident.severity}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadgeClass(incident.status)}`}>
                {incident.status.replace(/_/g, " ")}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">&times;</button>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{incident.title}</h2>
          <p className="text-sm text-gray-400 mb-3">{incident.description}</p>
          <div className="flex flex-wrap gap-2">
            {incident.affectedServices.map((svc) => (
              <span key={svc} className="text-xs bg-slate-700 text-gray-300 px-2 py-0.5 rounded">{svc}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span>Opened: {new Date(incident.createdAt).toLocaleString()}</span>
            {incident.resolvedAt && <span>Resolved: {new Date(incident.resolvedAt).toLocaleString()}</span>}
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={14} /> Timeline
          </h3>
          <div className="space-y-4">
            {incident.updates.map((u, idx) => (
              <div key={u.id} className="relative pl-6 pb-4 border-l border-slate-700 last:border-l-0 last:pb-0">
                <div className="absolute left-0 top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-600" />
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadgeClass(u.status)}`}>
                    {u.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-300">{u.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [overallStatus, setOverallStatus] = useState<string>("operational");
  const [overallMessage, setOverallMessage] = useState<string>("All Systems Operational");
  const [components, setComponents] = useState<StatusComponent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [history, setHistory] = useState<Incident[]>([]);
  const [uptimeData, setUptimeData] = useState<UptimeEntry[]>([]);
  const [lastChecked, setLastChecked] = useState<string>(new Date().toISOString());
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [subscriptionEmail, setSubscriptionEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, incidentsRes, historyRes, uptimeRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/status`).then((r) => r.json()),
        fetch(`${API_BASE}/api/v1/status/incidents?limit=5`).then((r) => r.json()),
        fetch(`${API_BASE}/api/v1/status/history`).then((r) => r.json()),
        fetch(`${API_BASE}/api/v1/status/uptime?period=30`).then((r) => r.json()),
      ]);
      setOverallStatus(statusRes.status);
      setOverallMessage(statusRes.message);
      setComponents(statusRes.components || []);
      setIncidents(incidentsRes.data || []);
      setHistory(historyRes.data || []);
      setUptimeData(uptimeRes.history || []);
      setLastChecked(new Date().toISOString());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (subscriptionEmail) {
      setSubscribed(true);
      setSubscriptionEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const overallHealthy = overallStatus === "operational";
  const uptimeAvg = uptimeData.length > 0
    ? (uptimeData.reduce((s, e) => s + e.uptime, 0) / uptimeData.length).toFixed(2)
    : "99.99";

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-white font-semibold text-lg">NexPay</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="https://docs.nexpay.com" className="text-sm text-gray-400 hover:text-white transition">Docs</Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition">Home</Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center">
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border mb-6 ${overallHealthy ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
            <span className={`w-4 h-4 rounded-full ${overallHealthy ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
            <span className={`text-lg font-semibold ${overallHealthy ? "text-emerald-400" : "text-red-400"}`}>
              {overallHealthy ? "All Systems Operational" : overallMessage}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">NexPay Status</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Real-time status of NexPay services. Subscribe to notifications for incident updates.
          </p>
        </section>

        {/* Status Grid */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Service Components</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {components.map((c) => (
              <div key={c.id} className={`rounded-xl border p-4 ${statusBgColor(c.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${statusColor(c.status)}`} />
                </div>
                <p className={`text-xs ${statusTextColor(c.status)} font-medium capitalize mb-1`}>
                  {c.status.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gray-500">{c.description}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="text-emerald-400 font-medium">{c.uptime}%</span>
                  <span>uptime</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active Incidents */}
        {incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED").length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              Active Incidents
            </h2>
            <div className="space-y-3">
              {incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED").map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  expanded={expandedIncident === inc.id}
                  onToggle={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)}
                  onViewDetail={() => setSelectedIncident(inc)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Uptime Chart */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">30-Day Uptime</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-3xl font-bold text-emerald-400">{uptimeAvg}%</span>
                <span className="text-sm text-gray-500 ml-2">average uptime</span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={uptimeData}>
                  <defs>
                    <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[99, 100]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Uptime"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="uptime"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#uptimeGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Past Incidents */}
        {history.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Past Incidents</h2>
            <div className="space-y-3">
              {history.slice(0, 10).map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  expanded={expandedIncident === inc.id}
                  onToggle={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)}
                  onViewDetail={() => setSelectedIncident(inc)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Subscription */}
        <section className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Stay Updated</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Get notified via email when incidents are reported, updated, or resolved.
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={subscriptionEmail}
                    onChange={(e) => setSubscriptionEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors font-medium"
                >
                  {subscribed ? <Check size={14} /> : <ArrowRight size={14} />}
                  {subscribed ? "Subscribed" : "Subscribe"}
                </button>
              </form>
            </div>
            <div className="flex gap-4 justify-center md:justify-end">
              <a href="#" className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
                <Rss size={16} className="text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-white">RSS Feed</p>
                  <p className="text-xs text-gray-500">Atom format</p>
                </div>
              </a>
              <a href="mailto:support@nexpay.com" className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
                <Mail size={16} className="text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">Contact</p>
                  <p className="text-xs text-gray-500">Support team</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Last checked: {new Date(lastChecked).toLocaleTimeString()}
            </span>
            <span>Auto-refreshes every 30s</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/" className="text-gray-500 hover:text-gray-300 transition">Home</Link>
            <Link href="https://docs.nexpay.com" className="text-gray-500 hover:text-gray-300 transition">Docs</Link>
            <a href="mailto:support@nexpay.com" className="text-gray-500 hover:text-gray-300 transition">Support</a>
          </div>
        </div>
      </footer>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetail incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}
    </div>
  );
}

function IncidentCard({ incident, expanded, onToggle, onViewDetail }: {
  incident: Incident;
  expanded: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">{incident.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{incident.description?.slice(0, 120)}{incident.description?.length > 120 ? "..." : ""}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded font-medium border ${severityBadgeClass(incident.severity)}`}>
              {incident.severity}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadgeClass(incident.status)}`}>
              {incident.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-gray-500">{new Date(incident.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-700 p-4">
          <div className="space-y-2 mb-4">
            {incident.updates.map((u) => (
              <div key={u.id} className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${u.status === "RESOLVED" ? "bg-emerald-500" : "bg-amber-500"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadgeClass(u.status)}`}>
                      {u.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-300 mt-1">{u.message}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onViewDetail}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink size={12} /> View full timeline
          </button>
        </div>
      )}
    </div>
  );
}
