"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISPUTE_COLORS: Record<string, string> = {
  RAISED: "bg-red-100 text-red-800",
  EVIDENCE_SUBMITTED: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  RESOLVED_MERCHANT_WON: "bg-green-100 text-green-800",
  RESOLVED_MERCHANT_LOST: "bg-gray-100 text-gray-800",
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("nexpay_token") : null;

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/disputes`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((d) => setDisputes(d.data || []));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">NexPay</Link>
          <Link href="/disputes" className="text-blue-600 font-medium">Disputes</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-6">Disputes & Chargebacks</h2>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Payment</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Reason</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d: any) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{d.paymentId?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm">{d.reason}</td>
                  <td className="px-4 py-3 text-sm font-medium">${Number(d.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${DISPUTE_COLORS[d.status] || ""}`}>
                      {d.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
