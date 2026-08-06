"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Eye } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    adminFetch<{ data: Record<string, unknown>[] }>("/api/v1/admin/merchants").then((d) =>
      setMerchants(d.data || [])
    );
  }, []);

  const patchMerchant = (id: string, path: string, body: object) =>
    adminFetch(`/api/v1/admin/merchants/${id}/${path}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(() => window.location.reload());

  return (
    <Card className="">
      <CardHeader><CardTitle>Merchants</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Email</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">KYC</TableHead>
              <TableHead className="text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.map((m) => (
              <TableRow key={String(m.id)} className="">
                <TableCell className="font-medium">{String(m.name)}</TableCell>
                <TableCell className="text-foreground">{String(m.email)}</TableCell>
                <TableCell><Badge variant={statusBadgeVariant(String(m.status)) as "success"}>{String(m.status)}</Badge></TableCell>
                <TableCell><Badge variant={statusBadgeVariant(String(m.kycStatus)) as "success"}>{String(m.kycStatus)}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-slate-600 text-foreground">
                      <Eye className="mr-1 h-3 w-3" /> View
                    </Button>
                    {m.kycStatus !== "VERIFIED" && (
                      <Button size="sm" variant="outline" className="border-emerald-800 text-emerald-400"
                        onClick={() => patchMerchant(String(m.id), "kyc", { status: "VERIFIED" })}>
                        Verify KYC
                      </Button>
                    )}
                    {m.status !== "SUSPENDED" && (
                      <Button size="sm" variant="destructive"
                        onClick={() => patchMerchant(String(m.id), "status", { status: "SUSPENDED" })}>
                        Suspend
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
