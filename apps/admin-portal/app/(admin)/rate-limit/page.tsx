"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Unlock, Lock } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export default function RateLimitPage() {
  const [rateLimits, setRateLimits] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    adminFetch<{ data: Record<string, unknown>[] }>("/api/v1/admin/rate-limits").then((d) =>
      setRateLimits(d.data || [])
    );
  }, []);

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader><CardTitle>Rate Limit Override</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Input placeholder="Enter IP address" className="flex-1  bg-muted/50 text-white" />
          <Button className="bg-blue-600 text-white hover:bg-blue-500"><Unlock className="mr-1 h-4 w-4" /> Unblock</Button>
          <Button variant="outline" className="border-slate-600 text-foreground"><Lock className="mr-1 h-4 w-4" /> Add Allowlist</Button>
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader><CardTitle>Blocked IPs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead className="text-muted-foreground">IP Address</TableHead>
                <TableHead className="text-muted-foreground">Endpoint</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateLimits.map((r) => (
                <TableRow key={String(r.ip)} className="">
                  <TableCell className="font-mono text-sm text-white">{String(r.ip)}</TableCell>
                  <TableCell className="text-sm text-foreground">{String(r.endpoint)}</TableCell>
                  <TableCell><Badge variant={r.blocked ? "destructive" : "success"}>{r.blocked ? "Blocked" : "Active"}</Badge></TableCell>
                  <TableCell className="text-sm text-foreground">{String(r.reason || "—")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
