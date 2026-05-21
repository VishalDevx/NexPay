"use client";

import { useEffect, useState } from "react";
import {
  LifeBuoy, Shield, FileText, Activity, AlertTriangle, DollarSign,
  Webhook, Zap, CheckCircle, XCircle, MessageSquare, ChevronDown,
  ChevronRight, Plus, Send, UserCheck, Search, Clock, Globe,
  Server, Database, Ban, Save, ExternalLink, Eye,
} from "lucide-react";

type OpsTab = "support" | "kyc" | "reviews" | "activity" | "payouts" | "webhooks" | "incidents" | "reserve";

const severityColors: Record<string, string> = {
  SEV1: "bg-red-900/50 text-red-400 border-red-700",
  SEV2: "bg-orange-900/50 text-orange-400 border-orange-700",
  SEV3: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
};

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-900/50 text-red-400",
  HIGH: "bg-orange-900/50 text-orange-400",
  MEDIUM: "bg-yellow-900/50 text-yellow-400",
  LOW: "bg-slate-700 text-slate-300",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-900/50 text-blue-400",
  PENDING_MERCHANT: "bg-amber-900/50 text-amber-400",
  RESOLVED: "bg-emerald-900/50 text-emerald-400",
  CLOSED: "bg-slate-700 text-slate-400",
  DRAFT: "bg-slate-700 text-slate-400",
  SUBMITTED: "bg-blue-900/50 text-blue-400",
  UNDER_REVIEW: "bg-amber-900/50 text-amber-400",
  ACTIVE: "bg-emerald-900/50 text-emerald-400",
  REJECTED: "bg-red-900/50 text-red-400",
  SUSPENDED: "bg-red-900/50 text-red-400",
  INVESTIGATING: "bg-purple-900/50 text-purple-400",
  MITIGATING: "bg-orange-900/50 text-orange-400",
  POSTMORTEM: "bg-indigo-900/50 text-indigo-400",
  PENDING: "bg-amber-900/50 text-amber-400",
  APPROVED: "bg-emerald-900/50 text-emerald-400",
};

export default function OpsPage() {
  const [tab, setTab] = useState<OpsTab>("support");
  const [token, setToken] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";

  useEffect(() => {
    const t = localStorage.getItem("nexpay_admin_token");
    if (t) setToken(t);
  }, []);

  const adminFetch = async (path: string, opts?: any) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts?.headers },
    });
    return res.json();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center max-w-sm w-full">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Shield size={24} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Ops Dashboard</h2>
          <p className="text-sm text-gray-400">Please sign in from the main admin page first.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "support" as OpsTab, label: "Support Queue", icon: LifeBuoy },
    { id: "kyc" as OpsTab, label: "Pending KYC", icon: Shield },
    { id: "reviews" as OpsTab, label: "Merchant Reviews", icon: FileText },
    { id: "activity" as OpsTab, label: "Activity Logs", icon: Activity },
    { id: "payouts" as OpsTab, label: "Payout Failures", icon: DollarSign },
    { id: "webhooks" as OpsTab, label: "Webhook Failures", icon: Webhook },
    { id: "incidents" as OpsTab, label: "Incidents", icon: Zap },
    { id: "reserve" as OpsTab, label: "Reserve Approvals", icon: Ban },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">NexPay Admin — Ops</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 bg-slate-800 px-2 py-1 rounded">Operations</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-1 mb-8 p-1 bg-slate-800 rounded-xl border border-slate-700 w-fit">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "text-gray-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "support" && <SupportQueue adminFetch={adminFetch} />}
        {tab === "kyc" && <PendingKYC adminFetch={adminFetch} />}
        {tab === "reviews" && <MerchantReviews adminFetch={adminFetch} />}
        {tab === "activity" && <ActivityLogs adminFetch={adminFetch} />}
        {tab === "payouts" && <PayoutFailures adminFetch={adminFetch} />}
        {tab === "webhooks" && <WebhookFailures adminFetch={adminFetch} />}
        {tab === "incidents" && <Incidents adminFetch={adminFetch} />}
        {tab === "reserve" && <ReserveApprovals adminFetch={adminFetch} />}
      </div>
    </div>
  );
}

function SupportQueue({ adminFetch }: { adminFetch: Function }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminFetch("/api/v1/admin/ops/support-queue").then((d: any) => {
      setTickets(d.data || []);
      setLoading(false);
    });
  }, [fetchKey]);

  const expandTicket = async (ticket: any) => {
    if (expandedId === ticket.id) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(ticket.id);
    const d = await adminFetch(`/api/v1/admin/ops/support-queue`);
    const found = (d.data || []).find((t: any) => t.id === ticket.id);
    setExpandedData(found);
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    await adminFetch(`/api/v1/admin/ops/support-tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: replyText, isInternal }),
    });
    setReplyText("");
    setIsInternal(false);
    expandTicket({ id: ticketId } as any);
    setFetchKey((k) => k + 1);
  };

  const changeStatus = async (ticketId: string, status: string) => {
    await adminFetch(`/api/v1/admin/ops/support-tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setFetchKey((k) => k + 1);
  };

  const assignToSelf = async (ticketId: string) => {
    await adminFetch(`/api/v1/admin/ops/support-tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: "admin" }),
    });
    setFetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <LifeBuoy size={18} /> Support Queue
          </h3>
          <span className="text-xs text-gray-500 bg-slate-700 px-2 py-1 rounded">{tickets.length} open</span>
        </div>
        {loading && tickets.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No open tickets</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket: any) => (
              <div key={ticket.id} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                <button
                  onClick={() => expandTicket(ticket)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      {expandedId === ticket.id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{ticket.merchant?.name || "Unknown"} — {ticket.merchant?.email || ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ticket.category && <span className="text-xs bg-slate-700 text-gray-300 px-2 py-0.5 rounded">{ticket.category}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColors[ticket.priority] || priorityColors.LOW}`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[ticket.status] || statusColors.OPEN}`}>
                        {ticket.status?.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
                {expandedId === ticket.id && expandedData?.id === ticket.id && (
                  <div className="border-t border-slate-700 p-4 space-y-4">
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(expandedData.messages || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No messages yet</p>
                      ) : (
                        <div className="space-y-2">
                          {expandedData.messages?.map((msg: any) => (
                            <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.isInternal ? "bg-amber-900/20 border border-amber-700/30" : msg.authorType === "ADMIN" ? "bg-blue-900/20 border border-blue-700/30" : "bg-slate-800"}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${msg.isInternal ? "text-amber-400" : msg.authorType === "ADMIN" ? "text-blue-400" : "text-gray-300"}`}>
                                  {msg.isInternal ? "INTERNAL NOTE" : msg.authorType === "ADMIN" ? "ADMIN" : "MERCHANT"}
                                </span>
                                <span className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type a reply..."
                          rows={2}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            className="rounded bg-slate-700 border-slate-600"
                          />
                          Internal note
                        </label>
                        <button
                          onClick={() => handleReply(ticket.id)}
                          disabled={!replyText.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors"
                        >
                          <Send size={14} /> Send
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                      <select
                        onChange={(e) => changeStatus(ticket.id, e.target.value)}
                        value={ticket.status}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OPEN">Open</option>
                        <option value="PENDING_MERCHANT">Pending Merchant</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      <button
                        onClick={() => assignToSelf(ticket.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-xs transition-colors"
                      >
                        <UserCheck size={12} /> Assign to me
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingKYC({ adminFetch }: { adminFetch: Function }) {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminFetch("/api/v1/admin/ops/pending-kyc").then((d: any) => {
      setMerchants(d.data || []);
      setLoading(false);
    });
  }, [fetchKey]);

  const handleApprove = async (id: string) => {
    await adminFetch(`/api/v1/admin/ops/merchants/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setReason("");
    setActionId(null);
    setAction(null);
    setFetchKey((k) => k + 1);
  };

  const handleReject = async (id: string) => {
    await adminFetch(`/api/v1/admin/ops/merchants/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setReason("");
    setActionId(null);
    setAction(null);
    setFetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Shield size={18} /> Pending KYC Review
          </h3>
          <span className="text-xs text-gray-500 bg-slate-700 px-2 py-1 rounded">{merchants.length} pending</span>
        </div>
        {loading && merchants.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : merchants.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No pending KYC reviews</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {merchants.map((m: any) => (
              <div key={m.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[m.kycStatus] || "bg-slate-700 text-slate-300"}`}>
                    {m.kycStatus?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800 rounded p-2">
                    <span className="text-gray-500">Business Type</span>
                    <p className="text-white">{m.businessType || "—"}</p>
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <span className="text-gray-500">Risk Category</span>
                    <p className="text-white">{m.riskCategory || "—"}</p>
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <span className="text-gray-500">Risk Score</span>
                    <p className="text-white">{m.riskScore != null ? m.riskScore : "—"}</p>
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <span className="text-gray-500">Submitted</span>
                    <p className="text-white">{m.kycSubmittedAt ? new Date(m.kycSubmittedAt).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
                {(m.uploads || []).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Documents ({m.uploads.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {m.uploads.map((u: any) => (
                        <span key={u.id} className="text-xs bg-slate-800 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                          <ExternalLink size={10} /> {u.filename || u.type || "doc"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {actionId === m.id && action ? (
                  <div className="space-y-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={`Reason for ${action}...`}
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => action === "approve" ? handleApprove(m.id) : handleReject(m.id)}
                        disabled={!reason.trim()}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white transition-colors ${
                          action === "approve"
                            ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-gray-500"
                            : "bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-gray-500"
                        }`}
                      >
                        {action === "approve" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        Confirm {action === "approve" ? "Approve" : "Reject"}
                      </button>
                      <button
                        onClick={() => { setActionId(null); setAction(null); setReason(""); }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setActionId(m.id); setAction("approve"); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition-colors"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button
                      onClick={() => { setActionId(m.id); setAction("reject"); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs transition-colors"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MerchantReviews({ adminFetch }: { adminFetch: Function }) {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminFetch("/api/v1/admin/ops/pending-reviews").then((d: any) => {
      setMerchants(d.data || []);
      setLoading(false);
    });
  }, [fetchKey]);

  const handleApprove = async (id: string) => {
    await adminFetch(`/api/v1/admin/ops/merchants/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setReason("");
    setActionId(null);
    setAction(null);
    setFetchKey((k) => k + 1);
  };

  const handleReject = async (id: string) => {
    await adminFetch(`/api/v1/admin/ops/merchants/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setReason("");
    setActionId(null);
    setAction(null);
    setFetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <FileText size={18} /> Pending Merchant Reviews
          </h3>
          <span className="text-xs text-gray-500 bg-slate-700 px-2 py-1 rounded">{merchants.length} pending</span>
        </div>
        {loading && merchants.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : merchants.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No pending reviews</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Merchant</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Business Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Expected Volume</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m: any) => (
                  <tr key={m.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <p className="text-white font-medium">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{m.businessType || "—"}</td>
                    <td className="py-3 px-4 text-gray-300">{m.expectedMonthlyVolume || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${m.riskCategory === "HIGH" ? "bg-red-900/50 text-red-400" : m.riskCategory === "MEDIUM" ? "bg-amber-900/50 text-amber-400" : "bg-slate-700 text-slate-300"}`}>
                        {m.riskCategory || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[m.status] || "bg-slate-700 text-slate-300"}`}>
                        {m.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      {actionId === m.id && action ? (
                        <div className="space-y-2">
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={`Reason for ${action}...`}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => action === "approve" ? handleApprove(m.id) : handleReject(m.id)}
                              disabled={!reason.trim()}
                              className={`px-2 py-1 rounded text-xs text-white transition-colors ${
                                action === "approve"
                                  ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-gray-500"
                                  : "bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-gray-500"
                              }`}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => { setActionId(null); setAction(null); setReason(""); }}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setActionId(m.id); setAction("approve"); }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setActionId(m.id); setAction("reject"); }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityLogs({ adminFetch }: { adminFetch: Function }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = actionFilter ? `?action=${actionFilter}` : "";
    adminFetch(`/api/v1/admin/ops/activity-logs${params}`).then((d: any) => {
      setLogs(d.data || []);
      setLoading(false);
    });
  }, [actionFilter]);

  const actionTypes = [...new Set(logs.map((l: any) => l.action))];

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Activity size={18} /> Activity Logs
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {actionTypes.map((a) => (
                <option key={a as string} value={a as string}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        {loading && logs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No activity logs found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Resource</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Details</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">IP</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <span className="text-xs bg-slate-700 text-gray-200 px-2 py-0.5 rounded font-mono">{log.action}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ""}
                    </td>
                    <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{log.details || "—"}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono">{log.ip || "—"}</td>
                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutFailures({ adminFetch }: { adminFetch: Function }) {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminFetch("/api/v1/admin/ops/payout-failures").then((d: any) => {
      setPayouts(d.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <DollarSign size={18} /> Failed Payouts
          </h3>
          <span className="text-xs text-gray-500 bg-slate-700 px-2 py-1 rounded">{payouts.length} failed</span>
        </div>
        {loading && payouts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No failed payouts</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Merchant</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Currency</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Items</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-xs text-gray-300">{p.id.slice(0, 12)}...</td>
                    <td className="py-3 px-4">
                      <p className="text-white text-sm">{p.merchant?.name || "Unknown"}</p>
                      <p className="text-xs text-gray-400">{p.merchant?.email || ""}</p>
                    </td>
                    <td className="py-3 px-4 text-white font-medium">${Number(p.amount)?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-300">{p.currency || "USD"}</td>
                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-400">{(p.items || []).length} item(s)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookFailures({ adminFetch }: { adminFetch: Function }) {
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminFetch("/api/v1/admin/ops/webhook-failures").then((d: any) => {
      setFailures(d.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Webhook size={18} /> Failed Webhook Deliveries
          </h3>
          <span className="text-xs text-gray-500 bg-slate-700 px-2 py-1 rounded">{failures.length} failed</span>
        </div>
        {loading && failures.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : failures.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No webhook failures</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Endpoint URL</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Payment</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Attempts</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f: any) => (
                  <tr key={f.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <p className="text-xs text-blue-400 font-mono truncate max-w-[200px]" title={f.endpoint?.url}>{f.endpoint?.url || "—"}</p>
                      <p className="text-xs text-gray-500">Merchant: {f.endpoint?.merchantId?.slice(0, 8)}...</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-300">{f.payment?.id?.slice(0, 12)}...</td>
                    <td className="py-3 px-4 text-gray-300">${Number(f.payment?.amount)?.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${f.status === "DEAD_LETTER" ? "bg-red-900/50 text-red-400" : "bg-amber-900/50 text-amber-400"}`}>
                        {f.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">{f.attempts || 0}</td>
                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(f.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Incidents({ adminFetch }: { adminFetch: Function }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("SEV3");
  const [affectedServices, setAffectedServices] = useState<string[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [postmortemRC, setPostmortemRC] = useState("");
  const [postmortemImpact, setPostmortemImpact] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const serviceOptions = ["API", "Dashboard", "Payments", "Payouts", "Webhooks", "KYC", "Database", "Redis"];

  useEffect(() => {
    setLoading(true);
    adminFetch("/api/v1/incidents/active").then((d: any) => {
      setIncidents(d.data || []);
      setLoading(false);
    });
  }, [fetchKey]);

  const toggleService = (svc: string) => {
    if (affectedServices.includes(svc)) {
      setAffectedServices(affectedServices.filter((s) => s !== svc));
    } else {
      setAffectedServices([...affectedServices, svc]);
    }
  };

  const createIncident = async () => {
    if (!title.trim()) return;
    await adminFetch("/api/v1/incidents", {
      method: "POST",
      body: JSON.stringify({ title, description, severity, affectedServices }),
    });
    setTitle("");
    setDescription("");
    setSeverity("SEV3");
    setAffectedServices([]);
    setShowForm(false);
    setFetchKey((k) => k + 1);
  };

  const changeIncidentStatus = async (id: string) => {
    if (!newStatus) return;
    await adminFetch(`/api/v1/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus, message: statusMessage }),
    });
    setNewStatus("");
    setStatusMessage("");
    setFetchKey((k) => k + 1);
  };

  const addUpdate = async (id: string) => {
    if (!statusMessage.trim()) return;
    await adminFetch(`/api/v1/incidents/${id}/updates`, {
      method: "POST",
      body: JSON.stringify({ message: statusMessage }),
    });
    setStatusMessage("");
    setFetchKey((k) => k + 1);
  };

  const submitPostmortem = async (id: string) => {
    if (!postmortemRC.trim() || !postmortemImpact.trim()) return;
    await adminFetch(`/api/v1/incidents/${id}/postmortem`, {
      method: "POST",
      body: JSON.stringify({ rootCause: postmortemRC, impact: postmortemImpact }),
    });
    setPostmortemRC("");
    setPostmortemImpact("");
    setSelectedIncident(null);
    setFetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Zap size={18} /> Active Incidents
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            <Plus size={14} /> New Incident
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4 space-y-3">
            <h4 className="text-white text-sm font-medium">Create Incident</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SEV3">SEV3 — Minor</option>
                  <option value="SEV2">SEV2 — Major</option>
                  <option value="SEV1">SEV1 — Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Affected Services</label>
                <div className="flex flex-wrap gap-1">
                  {serviceOptions.map((svc) => (
                    <button
                      key={svc}
                      onClick={() => toggleService(svc)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        affectedServices.includes(svc)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                      }`}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createIncident}
                disabled={!title.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors"
              >
                <Save size={14} /> Create
              </button>
            </div>
          </div>
        )}

        {loading && incidents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No active incidents</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                      {selectedIncident?.id === inc.id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{inc.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{inc.description?.slice(0, 100)}{inc.description?.length > 100 ? "..." : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium border ${severityColors[inc.severity] || "bg-slate-700 text-slate-300"}`}>
                        {inc.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[inc.status] || "bg-slate-700 text-slate-300"}`}>
                        {inc.status?.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(inc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
                {selectedIncident?.id === inc.id && (
                  <div className="border-t border-slate-700 p-4 space-y-4">
                    {(inc.affectedServices || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {inc.affectedServices.map((svc: string) => (
                          <span key={svc} className="text-xs bg-slate-800 text-gray-300 px-2 py-0.5 rounded">{svc}</span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      <p className="text-xs text-gray-500 uppercase font-medium">Timeline</p>
                      {(inc.updates || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No updates yet</p>
                      ) : (
                        inc.updates.map((u: any) => (
                          <div key={u.id} className="bg-slate-800 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[u.status] || "bg-slate-700 text-slate-300"}`}>
                                {u.status?.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-200">{u.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-slate-700 pt-3 space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Change status...</option>
                          <option value="INVESTIGATING">Investigating</option>
                          <option value="MITIGATING">Mitigating</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                        <input
                          value={statusMessage}
                          onChange={(e) => setStatusMessage(e.target.value)}
                          placeholder="Status message..."
                          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => changeIncidentStatus(inc.id)}
                          disabled={!newStatus}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg text-xs transition-colors"
                        >
                          Update
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={statusMessage}
                          onChange={(e) => setStatusMessage(e.target.value)}
                          placeholder="Add timeline update..."
                          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => addUpdate(inc.id)}
                          disabled={!statusMessage.trim()}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:text-gray-500 text-gray-300 rounded-lg text-xs transition-colors"
                        >
                          Add Update
                        </button>
                      </div>
                      {inc.status !== "POSTMORTEM" && (
                        <div className="border-t border-slate-700 pt-3">
                          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Postmortem</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={postmortemRC}
                              onChange={(e) => setPostmortemRC(e.target.value)}
                              placeholder="Root cause..."
                              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              value={postmortemImpact}
                              onChange={(e) => setPostmortemImpact(e.target.value)}
                              placeholder="Impact..."
                              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => submitPostmortem(inc.id)}
                            disabled={!postmortemRC.trim() || !postmortemImpact.trim()}
                            className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg text-xs transition-colors"
                          >
                            Submit Postmortem
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReserveApprovals({ adminFetch }: { adminFetch: Function }) {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminFetch("/api/v1/admin/ledger-adjustments").then((d: any) => {
      setAdjustments(d.data || []);
      setLoading(false);
    });
  }, [fetchKey]);

  const handleApprove = async (id: string) => {
    setApproving(id);
    await adminFetch(`/api/v1/admin/ledger-adjustments/${id}/approve`, {
      method: "POST",
    });
    setApproving(null);
    setFetchKey((k) => k + 1);
  };

  const pending = adjustments.filter((a: any) => a.status === "PENDING");

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Ban size={18} /> Pending Reserve Approvals
          </h3>
          <span className="text-xs text-gray-500 bg-slate-700 px-2 py-1 rounded">{pending.length} pending</span>
        </div>
        {loading && adjustments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No pending reserve adjustments</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Account</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Reason</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Requested By</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-xs text-gray-300">{a.id.slice(0, 12)}...</td>
                    <td className="py-3 px-4 text-white font-medium">${Number(a.amount)?.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${a.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 font-mono">{a.accountId?.slice(0, 12)}...</td>
                    <td className="py-3 px-4 text-gray-400 max-w-[200px] truncate">{a.reason || "—"}</td>
                    <td className="py-3 px-4 text-xs text-gray-400">{a.requestedBy?.slice(0, 12)}...</td>
                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleApprove(a.id)}
                        disabled={approving === a.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg text-xs transition-colors"
                      >
                        {approving === a.id ? "..." : <CheckCircle size={12} />}
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
