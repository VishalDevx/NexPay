"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/disputes`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => {
        setDisputes(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="text-sm text-gray-500 mt-1">Manage chargebacks and customer disputes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispute History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : disputes.length > 0 ? (
                disputes.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.paymentId?.slice(0, 12)}...</TableCell>
                    <TableCell className="text-sm capitalize">{d.reason?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="font-medium">
                      {Number(d.amount)?.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(d.status) as any}>{d.status?.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      {d.status === "OPEN" && (
                        <Button variant="outline" size="sm">
                          Respond
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    No disputes. All clear.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
