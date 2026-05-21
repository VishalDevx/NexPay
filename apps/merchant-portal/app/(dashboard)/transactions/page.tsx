"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export default function TransactionsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nexpay_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/charges${filter ? `?status=${filter}` : ""}`, {
      headers: { "x-api-key": token || "" },
    })
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const filtered = search
    ? payments.filter((p) => p.id?.toLowerCase().includes(search.toLowerCase()))
    : payments;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage all payment transactions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Payment History</CardTitle>
            <div className="flex gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                options={[
                  { value: "CAPTURED", label: "Captured" },
                  { value: "FAILED", label: "Failed" },
                  { value: "REFUNDED", label: "Refunded" },
                  { value: "DISPUTED", label: "Disputed" },
                ]}
                placeholder="All Status"
                className="w-36"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id?.slice(0, 12)}...</TableCell>
                    <TableCell className="font-medium">
                      {Number(p.amount).toLocaleString("en-US", { style: "currency", currency: p.currency || "USD" })}
                    </TableCell>
                    <TableCell>{p.currency || "USD"}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(p.status) as any}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                    No transactions found
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
