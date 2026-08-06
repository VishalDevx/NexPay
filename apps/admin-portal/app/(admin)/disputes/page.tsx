"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { adminFetch } from "@/lib/admin-api";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    adminFetch<{ data: Record<string, unknown>[] }>("/api/v1/admin/disputes").then((d) =>
      setDisputes(d.data || [])
    );
  }, []);

  const resolve = (id: string, resolution: string) =>
    adminFetch(`/api/v1/admin/disputes/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    }).then(() => window.location.reload());

  return (
    <Card className="">
      <CardHeader><CardTitle>Disputes</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead className="text-muted-foreground">Payment</TableHead>
              <TableHead className="text-muted-foreground">Merchant</TableHead>
              <TableHead className="text-muted-foreground">Amount</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disputes.map((d) => {
              const payment = d.payment as { id?: string } | undefined;
              const merchant = d.merchant as { name?: string } | undefined;
              return (
                <TableRow key={String(d.id)} className="">
                  <TableCell className="font-mono text-xs">{payment?.id?.slice(0, 12)}...</TableCell>
                  <TableCell className="text-foreground">{merchant?.name}</TableCell>
                  <TableCell className="font-medium">${Number(d.amount)?.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusBadgeVariant(String(d.status)) as "warning"}>{String(d.status).replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>
                    {(d.status === "RAISED" || d.status === "UNDER_REVIEW") && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-emerald-800 text-emerald-400" onClick={() => resolve(String(d.id), "merchant_won")}>
                          Merchant Won
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-800 text-red-400" onClick={() => resolve(String(d.id), "merchant_lost")}>
                          Merchant Lost
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
