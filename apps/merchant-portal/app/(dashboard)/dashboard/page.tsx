"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function DashboardPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/charges`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const captured = payments.filter((p) => p.status === "CAPTURED" || p.status === "SETTLED");
  const failed = payments.filter((p) => p.status === "FAILED");
  const revenue = captured.reduce((s: number, p: any) => s + Number(p.amount), 0);

  const chartData = payments
    .filter((p) => p.createdAt)
    .reduce((acc: any, p: any) => {
      const date = new Date(p.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + Number(p.amount);
      return acc;
    }, {});

  const revenueChart = Object.entries(chartData).map(([date, amount]) => ({ date, amount }));

  const stats = [
    { label: "Total Transactions", value: payments.length.toString(), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Captured", value: captured.length.toString(), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Failed", value: failed.length.toString(), icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Revenue", value: `$${revenue.toFixed(2)}`, icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your payment activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    {loading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon size={24} className={stat.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue (Daily)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No transaction data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
