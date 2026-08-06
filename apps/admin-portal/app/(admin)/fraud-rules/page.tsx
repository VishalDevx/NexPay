"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export default function FraudRulesPage() {
  const [fraudRules, setFraudRules] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    adminFetch<{ data: Record<string, unknown>[] }>("/api/v1/admin/fraud-rules").then((d) =>
      setFraudRules(d.data || [])
    );
  }, []);

  const toggleRule = (id: string, enabled: boolean) =>
    adminFetch(`/api/v1/admin/fraud-rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !enabled }),
    }).then(() => window.location.reload());

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fraud Rules</CardTitle>
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-500"><Plus className="mr-1 h-4 w-4" /> Create Rule</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Weight</TableHead>
              <TableHead className="text-muted-foreground">Action</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Toggle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fraudRules.map((r) => (
              <TableRow key={String(r.id)} className="">
                <TableCell className="font-medium">{String(r.name)}</TableCell>
                <TableCell className="text-foreground">{String(r.scoreWeight)}</TableCell>
                <TableCell><Badge variant={statusBadgeVariant(String(r.action)) as "warning"}>{String(r.action)}</Badge></TableCell>
                <TableCell><Badge variant={r.enabled ? "success" : "neutral"}>{r.enabled ? "Enabled" : "Disabled"}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant={r.enabled ? "destructive" : "outline"} className={r.enabled ? "" : "border-slate-600 text-foreground"}
                    onClick={() => toggleRule(String(r.id), Boolean(r.enabled))}>
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
