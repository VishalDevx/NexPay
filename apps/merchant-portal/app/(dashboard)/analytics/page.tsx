"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  TrendingDown, Clock, RefreshCw, Users, Globe, Download,
  Smartphone, Monitor, AlertTriangle, BarChart3,
} from "lucide-react";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const mockFunnelData = [
  { stage: "Checkout Initiation", count: 10000, dropOff: 0 },
  { stage: "Payment Page", count: 8500, dropOff: 15 },
  { stage: "Authorization", count: 7800, dropOff: 8.2 },
  { stage: "Capture", count: 7450, dropOff: 4.5 },
];

const mockLatencyData = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  p50: Math.floor(Math.random() * 20 + 20),
  p95: Math.floor(Math.random() * 50 + 60),
  p99: Math.floor(Math.random() * 100 + 150),
}));

const mockFailureReasons = [
  { name: "Card Declined", value: 45 },
  { name: "Fraud Block", value: 25 },
  { name: "Bank Timeout", value: 15 },
  { name: "3DS Fail", value: 10 },
  { name: "Other", value: 5 },
];

const mockGeoData = [
  { country: "United States", volume: 450000, flag: "🇺🇸" },
  { country: "India", volume: 320000, flag: "🇮🇳" },
  { country: "United Kingdom", volume: 180000, flag: "🇬🇧" },
  { country: "Germany", volume: 95000, flag: "🇩🇪" },
  { country: "Singapore", volume: 72000, flag: "🇸🇬" },
  { country: "Australia", volume: 58000, flag: "🇦🇺" },
];

const mockDeviceData = [
  { name: "Mobile", value: 55, failureRate: 2.1 },
  { name: "Desktop", value: 30, failureRate: 1.5 },
  { name: "API", value: 15, failureRate: 0.8 },
];

export default function AnalyticsPage() {
  const [activeReport, setActiveReport] = useState("funnel");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Reporting</h1>
          <p className="text-sm text-gray-500 mt-1">Deep insights into your payment performance</p>
        </div>
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export Report</Button>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {[
          { id: "funnel", label: "Conversion Funnel", icon: TrendingDown },
          { id: "latency", label: "Latency", icon: Clock },
          { id: "failures", label: "Failures", icon: AlertTriangle },
          { id: "geo", label: "Geo Heatmap", icon: Globe },
          { id: "devices", label: "Devices", icon: Smartphone },
        ].map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                activeReport === r.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {r.label}
            </button>
          );
        })}
      </div>

      {activeReport === "funnel" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFunnelData.map((stage, i) => (
                  <div key={stage.stage}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{stage.count.toLocaleString()}</span>
                        {i > 0 && (
                          <span className="text-red-500 text-xs">-{stage.dropOff}%</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${(stage.count / mockFunnelData[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm text-gray-500">
                <span>Overall conversion: <strong className="text-gray-900">74.5%</strong></span>
                <Select className="w-32">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last quarter</option>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Cohort Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { cohort: "Jan 2026", mrr: 12500, retention: "100%" },
                  { cohort: "Feb 2026", mrr: 18200, retention: "89%" },
                  { cohort: "Mar 2026", mrr: 15300, retention: "76%" },
                  { cohort: "Apr 2026", mrr: 22100, retention: "82%" },
                  { cohort: "May 2026", mrr: 19800, retention: "94%" },
                ].map((c) => (
                  <div key={c.cohort} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-medium">{c.cohort}</span>
                    <div className="flex items-center gap-6">
                      <span className="text-sm">${c.mrr.toLocaleString()}</span>
                      <span className="text-sm text-emerald-600">{c.retention}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeReport === "latency" && (
        <Card>
          <CardHeader>
            <CardTitle>API Latency (P50 / P95 / P99)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={mockLatencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} name="P50" />
                <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} name="P95" />
                <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} name="P99" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-6 justify-center mt-4 text-sm">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500" /> P50: 24ms</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500" /> P95: 89ms</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500" /> P99: 245ms</span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeReport === "failures" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Failure Reasons</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={mockFailureReasons} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {mockFailureReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { attempt: "1st attempt", success: 85, color: "bg-green-500" },
                  { attempt: "2nd attempt", success: 8, color: "bg-blue-500" },
                  { attempt: "3rd attempt", success: 4, color: "bg-amber-500" },
                  { attempt: "4th+ attempt", success: 3, color: "bg-red-500" },
                ].map((r) => (
                  <div key={r.attempt}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{r.attempt}</span>
                      <span className="font-medium">{r.success}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${r.color} h-2 rounded-full`} style={{ width: `${r.success}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Chargeback Rate Tracker</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-emerald-600">0.18%</p>
                  <p className="text-sm text-gray-500">Current chargeback rate</p>
                </div>
                <div className="flex-1">
                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full" />
                    <div className="absolute top-0 left-[18%] h-full w-0.5 bg-white shadow-lg" />
                    <div className="absolute top-0 left-[100%] h-full w-0.5 bg-red-600 shadow-lg" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="font-medium text-amber-600">1% threshold</span>
                    <span>2%</span>
                  </div>
                </div>
                <Badge variant="success">Safe</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeReport === "geo" && (
        <Card>
          <CardHeader><CardTitle>Transaction Volume by Region</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockGeoData.map((g) => (
                <div key={g.country} className="flex items-center gap-4">
                  <span className="text-xl">{g.flag}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{g.country}</span>
                      <span className="text-gray-500">${(g.volume / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(g.volume / mockGeoData[0].volume) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeReport === "devices" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Device & Browser Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockDeviceData.map((d) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-gray-500">{d.value}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${d.value}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Failure rate: {d.failureRate}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly Recurring Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">$87,450</p>
                <p className="text-sm text-gray-500">MRR</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">ARR Projection</p>
                    <p className="font-bold text-lg">$1.05M</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">YoY Growth</p>
                    <p className="font-bold text-lg text-emerald-600">+34%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
