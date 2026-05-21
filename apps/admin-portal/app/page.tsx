"use client";

import { useEffect, useState } from "react";

type Tab = "merchants" | "disputes" | "fraud-rules" | "health";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("health");
  const [merchants, setMerchants] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [fraudRules, setFraudRules] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("nexpay_admin_token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL;

  const adminFetch = async (path: string, opts?: any) =>
    fetch(`${API}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-api-key": token || "", ...opts?.headers },
    }).then((r) => r.json());

  useEffect(() => {
    if (tab === "merchants") adminFetch("/api/v1/admin/merchants").then((d) => setMerchants(d.data || []));
    if (tab === "disputes") adminFetch("/api/v1/admin/disputes").then((d) => setDisputes(d.data || []));
    if (tab === "fraud-rules") adminFetch("/api/v1/admin/fraud-rules").then((d) => setFraudRules(d.data || []));
    if (tab === "health") adminFetch("/api/v1/admin/health").then(setHealth);
  }, [tab]);

  const NavButton = ({ label, id }: { label: string; id: Tab }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">NexPay Admin</h1>
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          <NavButton label="System Health" id="health" />
          <NavButton label="Merchants" id="merchants" />
          <NavButton label="Disputes" id="disputes" />
          <NavButton label="Fraud Rules" id="fraud-rules" />
        </div>

        {tab === "health" && (
          <div className="bg-gray-800 p-6 rounded-xl">
            <pre className="text-sm">{JSON.stringify(health, null, 2)}</pre>
          </div>
        )}

        {tab === "merchants" && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-gray-700"><th className="text-left p-3 text-sm">Name</th><th className="text-left p-3 text-sm">Email</th><th className="text-left p-3 text-sm">Status</th><th className="text-left p-3 text-sm">KYC</th><th className="text-left p-3 text-sm">Actions</th></tr></thead>
              <tbody>
                {merchants.map((m: any) => (
                  <tr key={m.id} className="border-b border-gray-700">
                    <td className="p-3 text-sm">{m.name}</td>
                    <td className="p-3 text-sm">{m.email}</td>
                    <td className="p-3 text-sm">{m.status}</td>
                    <td className="p-3 text-sm">{m.kycStatus}</td>
                    <td className="p-3 text-sm">
                      <button onClick={() => adminFetch(`/api/v1/admin/merchants/${m.id}/kyc`, { method: "PATCH", body: JSON.stringify({ status: "VERIFIED" }) }).then(() => window.location.reload())} className="text-blue-400 hover:underline text-xs mr-2">Verify KYC</button>
                      <button onClick={() => adminFetch(`/api/v1/admin/merchants/${m.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "SUSPENDED" }) }).then(() => window.location.reload())} className="text-red-400 hover:underline text-xs">Suspend</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "disputes" && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-gray-700"><th className="text-left p-3 text-sm">Payment</th><th className="text-left p-3 text-sm">Merchant</th><th className="text-left p-3 text-sm">Reason</th><th className="text-left p-3 text-sm">Status</th><th className="text-left p-3 text-sm">Actions</th></tr></thead>
              <tbody>
                {disputes.map((d: any) => (
                  <tr key={d.id} className="border-b border-gray-700">
                    <td className="p-3 text-sm font-mono">{d.payment?.id?.slice(0, 8)}...</td>
                    <td className="p-3 text-sm">{d.merchant?.name}</td>
                    <td className="p-3 text-sm">{d.reason}</td>
                    <td className="p-3 text-sm">{d.status}</td>
                    <td className="p-3 text-sm flex gap-2">
                      <button onClick={() => adminFetch(`/api/v1/admin/disputes/${d.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "merchant_won" }) }).then(() => window.location.reload())} className="text-green-400 hover:underline text-xs">Merchant Won</button>
                      <button onClick={() => adminFetch(`/api/v1/admin/disputes/${d.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "merchant_lost" }) }).then(() => window.location.reload())} className="text-red-400 hover:underline text-xs">Merchant Lost</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "fraud-rules" && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-gray-700"><th className="text-left p-3 text-sm">Name</th><th className="text-left p-3 text-sm">Score</th><th className="text-left p-3 text-sm">Action</th><th className="text-left p-3 text-sm">Enabled</th><th className="text-left p-3 text-sm">Toggle</th></tr></thead>
              <tbody>
                {fraudRules.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-700">
                    <td className="p-3 text-sm">{r.name}</td>
                    <td className="p-3 text-sm">{r.scoreWeight}</td>
                    <td className="p-3 text-sm">{r.action}</td>
                    <td className="p-3 text-sm">{r.enabled ? "Yes" : "No"}</td>
                    <td className="p-3 text-sm">
                      <button
                        onClick={() => adminFetch(`/api/v1/admin/fraud-rules/${r.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !r.enabled }) }).then(() => window.location.reload())}
                        className={`text-xs hover:underline ${r.enabled ? "text-red-400" : "text-green-400"}`}
                      >
                        {r.enabled ? "Disable" : "Enable"}
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
