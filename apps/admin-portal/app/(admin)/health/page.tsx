"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/ui/table";
import { CheckCircle, XCircle, Server, Clock } from "lucide-react";
import { adminFetch, defaultHealth } from "@/lib/admin-api";

export default function HealthPage() {
  const [health, setHealth] = useState(defaultHealth);

  useEffect(() => {
    adminFetch("/api/v1/admin/health").then((d) => setHealth((d as typeof defaultHealth) || defaultHealth));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">System health</h1>
        <p className="text-[13px] text-muted-foreground">Infrastructure status overview</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {["API", "Database", "Redis"].map((s) => {
          const key = s.toLowerCase() as "api" | "database" | "redis";
          const status = health?.[key] ?? "checking";
          const healthy = status === "healthy" || status === "ok";
          return (
            <Card key={s}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-[13px] text-muted-foreground">{s}</p>
                  <p className={`mt-0.5 text-lg font-semibold ${healthy ? "text-emerald-600" : "text-red-600"}`}>
                    {healthy ? "Healthy" : "Unhealthy"}
                  </p>
                </div>
                {healthy ? <CheckCircle size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-red-600" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Server className="h-3.5 w-3.5" /> Metrics</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 pt-0">
            {Object.entries(health?.latency || defaultHealth.latency).map(([k, v]) => (
              <div key={k} className="rounded-md bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
                <p className="text-sm font-semibold tabular-nums">{String(v)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5" /> Queues</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead className="text-xs">Queue</TableHead><TableHead className="text-xs">Depth</TableHead><TableHead className="text-xs">Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(health?.bullmq || defaultHealth.bullmq).map((q: { queue: string; depth: number }) => (
                  <TableRow key={q.queue}>
                    <td className="py-2 text-[13px]">{q.queue}</td>
                    <td className="py-2 text-[13px] tabular-nums">{q.depth}</td>
                    <td className="py-2 text-[12px] text-muted-foreground">{q.depth > 10 ? "Stressed" : "OK"}</td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
