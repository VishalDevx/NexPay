"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  INITIATED: "bg-gray-100 text-gray-800",
  PROCESSING: "bg-yellow-100 text-yellow-800",
  AUTHORIZED: "bg-blue-100 text-blue-800",
  CAPTURED: "bg-green-100 text-green-800",
  SETTLED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  DISPUTED: "bg-orange-100 text-orange-800",
};

export default function TransactionsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/charges${filter ? `?status=${filter}` : ""}`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => setPayments(data.data || []));
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">NexPay</Link>
          <Link href="/transactions" className="text-blue-600 font-medium">Transactions</Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Transactions</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="CAPTURED">Captured</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="DISPUTED">Disputed</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Currency</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{p.id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm font-medium">{Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{p.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">No transactions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
