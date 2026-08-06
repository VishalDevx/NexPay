"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Link2, Plus, Copy, X, Check, ExternalLink, Eye, Power, Trash2, AlertTriangle,
} from "lucide-react";

const currencies = ["INR", "USD", "EUR", "GBP"];

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: "",
    currency: "INR",
    description: "",
    expires_at: "",
  });

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>("/payment-links");
      setLinks(res.data || []);
    } catch (err: any) {
      console.error("Failed to fetch payment links:", err);
      setError(err?.message || "Failed to load payment links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const checkoutUrl = (slug: string) => `${window.location.origin}/pay/${slug}`;

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(checkoutUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Clipboard unavailable");
    }
  };

  const createLink = async () => {
    setCreating(true);
    setError("");
    try {
      const body: Record<string, any> = {
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description || undefined,
      };
      if (form.expires_at) body.expires_at = form.expires_at;
      await api.post<any>("/payment-links", body);
      setShowCreate(false);
      setForm({ amount: "", currency: "INR", description: "", expires_at: "" });
      fetchLinks();
    } catch (err: any) {
      setError(err?.message || "Failed to create payment link");
    } finally {
      setCreating(false);
    }
  };

  const deactivateLink = async (id: string) => {
    try {
      await api.post<any>(`/payment-links/${id}/deactivate`);
      fetchLinks();
    } catch (err: any) {
      setError(err?.message || "Failed to deactivate link");
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this payment link permanently?")) return;
    try {
      await api.delete<any>(`/payment-links/${id}`);
      fetchLinks();
    } catch (err: any) {
      setError(err?.message || "Failed to delete link");
    }
  };

  const money = (amount: string | number, currency: string) =>
    Number(amount).toLocaleString("en-US", { style: "currency", currency: currency || "INR" });

  const linkStatusBadge = (status: string) =>
    <Badge variant={statusBadgeVariant(status) as any}>{status}</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Links</h1>
          <p className="text-sm text-gray-500 mt-1">Create shareable links to collect payments from customers</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500 text-white" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create Link
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total links</p>
            <p className="text-2xl font-bold">{links.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{links.filter((l) => l.status === "ACTIVE").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-blue-600">
              {links.reduce((sum, l) => sum + (l.status === "COMPLETED" ? 1 : 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button className="ml-auto" onClick={() => setError("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : links.length > 0 ? (
                links.map((l: any) => (
                  <TableRow key={l.id} className="hover:bg-gray-50">
                    <TableCell>
                      <p className="font-mono text-xs font-medium">{l.slug}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{l.description || "No description"}</p>
                    </TableCell>
                    <TableCell className="font-medium">{money(l.amount, l.currency)}</TableCell>
                    <TableCell>{linkStatusBadge(l.status)}</TableCell>
                    <TableCell>
                      {l.payment ? (
                        <span className="text-xs font-mono text-gray-600">{l.payment.id.slice(0, 12)}…</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyLink(l.slug)} title="Copy checkout link">
                          {copied === l.slug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <a href={checkoutUrl(l.slug)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" title="Open checkout">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        {l.status === "ACTIVE" ? (
                          <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => deactivateLink(l.id)} title="Deactivate">
                            <Power className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteLink(l.id)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    <Link2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No payment links yet. Create your first one to start collecting payments.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCreate(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Create Payment Link</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                  <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-28">
                    {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  placeholder="e.g. Pro plan subscription, Consulting fee…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expires (optional)</label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                  disabled={!form.amount || Number(form.amount) <= 0 || creating}
                  onClick={createLink}
                >
                  {creating ? "Creating…" : "Create Link"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
