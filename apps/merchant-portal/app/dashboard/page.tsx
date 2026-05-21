"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const [merchant, setMerchant] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, captured: 0, failed: 0, revenue: 0 });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    const merchantData = localStorage.getItem("nexpay_merchant");
    if (!token) return router.push("/login");
    setMerchant(merchantData ? JSON.parse(merchantData) : null);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/charges`, {
      headers: { "x-api-key": token },
    })
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.data || []);
        const captured = (data.data || []).filter((p: any) => p.status === "CAPTURED" || p.status === "SETTLED");
        setStats({
          total: data.data?.length || 0,
          captured: captured.length,
          failed: (data.data || []).filter((p: any) => p.status === "FAILED").length,
          revenue: captured.reduce((s: number, p: any) => s + Number(p.amount), 0),
        });
      })
      .catch(() => {});
  }, []);

  const chartData = payments
    .filter((p) => p.createdAt)
    .reduce((acc: any, p: any) => {
      const date = new Date(p.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + Number(p.amount);
      return acc;
    }, {});

  const revenueChart = Object.entries(chartData).map(([date, amount]) => ({ date, amount }));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-blue-600">NexPay</h1>
            <div className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-blue-600 font-medium">Dashboard</Link>
              <Link href="/transactions" className="text-gray-600 hover:text-gray-900">Transactions</Link>
              <Link href="/payouts" className="text-gray-600 hover:text-gray-900">Payouts</Link>
              <Link href="/disputes" className="text-gray-600 hover:text-gray-900">Disputes</Link>
              <Link href="/developers" className="text-gray-600 hover:text-gray-900">Developers</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{merchant?.name}</span>
            <button
              onClick={() => {
                localStorage.clear();
                router.push("/login");
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Captured</p>
            <p className="text-3xl font-bold text-green-600">{stats.captured}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-3xl font-bold text-blue-600">${stats.revenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-medium mb-4">Revenue (Daily)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
