"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CheckCircle, XCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export default function KycPage() {
  const [merchants, setMerchants] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    adminFetch<{ data: Record<string, unknown>[] }>("/api/v1/admin/merchants").then((d) =>
      setMerchants((d.data || []).filter((m) => m.kycStatus !== "VERIFIED"))
    );
  }, []);

  const updateKyc = (id: string, status: string) =>
    adminFetch(`/api/v1/admin/merchants/${id}/kyc`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).then(() => window.location.reload());

  return (
    <Card className="">
      <CardHeader><CardTitle>KYC Approval Queue</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead className="text-muted-foreground">Merchant</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Submitted</TableHead>
              <TableHead className="text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">All KYC reviews completed</TableCell></TableRow>
            ) : (
              merchants.map((m) => (
                <TableRow key={String(m.id)} className="">
                  <TableCell>
                    <p className="font-medium">{String(m.name)}</p>
                    <p className="text-xs text-muted-foreground">{String(m.email)}</p>
                  </TableCell>
                  <TableCell><Badge variant={statusBadgeVariant(String(m.kycStatus)) as "warning"}>{String(m.kycStatus)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.createdAt ? new Date(String(m.createdAt)).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => updateKyc(String(m.id), "VERIFIED")}>
                        <CheckCircle className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" className="bg-red-600 text-white hover:bg-red-500" onClick={() => updateKyc(String(m.id), "REJECTED")}>
                        <XCircle className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
