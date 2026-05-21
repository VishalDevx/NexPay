"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  FileText, Repeat, Clock, DollarSign, Download, Eye,
  Plus, Check, Send,
} from "lucide-react";

export default function InvoicingPage() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<any[]>([]);
  const [taxConfig, setTaxConfig] = useState<any>({});

  useEffect(() => {
    async function fetchInvoicing() {
      try {
        const [invRes, recRes, taxRes] = await Promise.all([
          api.get<any>("/invoices"),
          api.get<any>("/invoices/recurring"),
          api.get<any>("/invoices/tax"),
        ]);
        setInvoices(invRes.data || []);
        setRecurringInvoices(recRes.data || []);
        setTaxConfig(taxRes);
      } catch (err) {
        console.error("Invoicing fetch error:", err);
      }
    }
    fetchInvoicing();
  }, []);

  const totalOutstanding = invoices
    .filter(inv => inv.status !== "Paid" && inv.status !== "Cancelled" && inv.status !== "Draft")
    .reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  const totalPaid = invoices
    .filter(inv => inv.status === "Paid")
    .reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  const overdueCount = invoices.filter(inv => inv.status === "Overdue").length;
  const overdueRate = invoices.length ? ((overdueCount / invoices.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoicing & Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Create, send, and manage invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Outstanding", value: `$${totalOutstanding.toLocaleString()}`, color: "text-red-600", bg: "bg-red-50" },
          { label: "Paid this month", value: `$${totalPaid.toLocaleString()}`, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg. payment time", value: "12 days", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Overdue rate", value: `${overdueRate}%`, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className={`p-5 ${s.bg}`}>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white" size="sm" onClick={() => setShowBuilder(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber || inv.id}</TableCell>
                  <TableCell>{inv.customerName || inv.customer}</TableCell>
                  <TableCell>${(inv.total || inv.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "Paid" ? "success" : inv.status === "Overdue" ? "destructive" : inv.status === "Draft" ? "neutral" : "warning"}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                      {inv.status === "Draft" && <Button variant="ghost" size="sm" className="text-blue-600"><Send className="w-4 h-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showBuilder && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle>Invoice Builder</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Bill to</label>
                <Input placeholder="Customer name or email" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Invoice date</label>
                <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due date</label>
                <Input type="date" defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Line items</label>
                <div className="bg-gray-50 rounded-xl p-4 border space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Description" />
                      <input className="w-20 border rounded-lg px-3 py-2 text-sm" placeholder="Qty" type="number" />
                      <input className="w-24 border rounded-lg px-3 py-2 text-sm" placeholder="Price" type="number" />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm"><Plus className="w-4 h-4 mr-1" /> Add line item</Button>
                </div>
              </div>
              <div className="col-span-2 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Subtotal: $1,500.00</p>
                  <p className="text-sm text-gray-500">GST (18%): $270.00</p>
                  <p className="text-lg font-bold">Total: $1,770.00</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white"><FileText className="w-4 h-4 mr-1" /> Save as Draft</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white"><Send className="w-4 h-4 mr-1" /> Send</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Repeat className="w-4 h-4" /> Recurring Invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recurringInvoices.map((r, i) => (
                <div key={r.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{r.customerName || r.customer}</p>
                    <p className="text-xs text-gray-500">{r.frequency} · Next: {r.nextDate || r.next || "—"}</p>
                  </div>
                  <p className="font-medium">${(r.total || r.amount || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4"><Plus className="w-4 h-4 mr-1" /> Create Recurring</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Tax Management</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">GST HSN/SAC</span>
                <span className="text-gray-500">{taxConfig.hsnCode || "9983"}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">GSTIN</span>
                <span className="text-gray-500 font-mono">{taxConfig.gstin || "27AAACP1234A1Z1"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">TDS Rate</span>
                <span className="text-gray-500">{taxConfig.tdsRate ? `${taxConfig.tdsRate}% (Section 194-O)` : "1% (Section 194-O)"}</span>
              </div>
            </div>
            <Button variant="outline" size="sm">Download Tax Summary</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
