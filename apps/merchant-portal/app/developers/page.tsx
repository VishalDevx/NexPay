"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DevelopersPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("nexpay_token") : null;

  const fetchKeys = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/api-keys`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((d) => setApiKeys(d.data || []));
  };

  const fetchWebhooks = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/webhooks`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((d) => setWebhooks(d.data || []));
  };

  useEffect(() => { fetchKeys(); fetchWebhooks(); }, []);

  const createKey = async (env: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": token || "" },
      body: JSON.stringify({ env }),
    });
    const data = await res.json();
    setNewKey(data.apiKey?.key);
    fetchKeys();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">NexPay</Link>
          <Link href="/developers" className="text-blue-600 font-medium">Developers</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-6">Developer Settings</h2>

        <section className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="text-lg font-medium mb-4">API Keys</h3>
          <div className="flex gap-3 mb-4">
            <button onClick={() => createKey("LIVE")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              + Create Live Key
            </button>
            <button onClick={() => createKey("TEST")} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">
              + Create Test Key
            </button>
          </div>
          {newKey && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-yellow-800">Save this key - it won&apos;t be shown again:</p>
              <p className="text-sm font-mono bg-yellow-100 p-2 rounded mt-1 break-all">{newKey}</p>
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm text-gray-500">Prefix</th>
                <th className="text-left py-2 text-sm text-gray-500">Environment</th>
                <th className="text-left py-2 text-sm text-gray-500">Created</th>
                <th className="text-left py-2 text-sm text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k: any) => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="py-2 text-sm font-mono">{k.prefix}***</td>
                  <td className="py-2 text-sm">{k.env}</td>
                  <td className="py-2 text-sm">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 text-sm">
                    {k.revokedAt ? <span className="text-red-600">Revoked</span> : <span className="text-green-600">Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-medium mb-4">Webhook Endpoints</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/merchants/webhooks`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": token || "" },
                body: JSON.stringify({
                  url: form.get("url"),
                  events: ["charge.captured", "charge.refunded", "charge.failed"],
                }),
              });
              fetchWebhooks();
              (e.target as HTMLFormElement).reset();
            }}
            className="flex gap-3 mb-4"
          >
            <input name="url" type="url" placeholder="https://example.com/webhook" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add</button>
          </form>
          <ul className="space-y-2">
            {webhooks.map((w: any) => (
              <li key={w.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm font-mono">{w.url}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${w.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {w.enabled ? "Active" : "Disabled"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
