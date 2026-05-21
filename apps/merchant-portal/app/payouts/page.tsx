"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PAYOUT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("nexpay_token") : null;

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payouts`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((d) => setPayouts(d.data || []));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">NexPay</Link>
          <Link href="/payouts" className="text-blue-600 font-medium">Payouts</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Payouts</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payouts`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": token || "" },
                body: JSON.stringify({ amount: form.get("amount"), currency: form.get("currency") || "INR" }),
              });
              window.location.reload();
            }}
            className="flex gap-2"
          >
            <input name="amount" type="number" step="0.01" placeholder="Amount" className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-32" required />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Request Payout</button>
          </form>
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Currency</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Bank Ref</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{p.id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm font-medium">{Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{p.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${PAYOUT_COLORS[p.status] || ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{p.bankRef || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
