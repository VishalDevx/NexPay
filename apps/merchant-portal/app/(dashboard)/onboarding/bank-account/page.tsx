"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Landmark, Check, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  isPrimary: boolean;
  verified: boolean;
}

export default function BankAccountPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState({
    accountName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    bankName: "",
  });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.accountNumber !== form.confirmAccountNumber) {
      setError("Account numbers do not match");
      return;
    }

    setVerifying(true);

    try {
      const res = await api.post<any>("/bank-accounts", {
        accountNumber: form.accountNumber,
        ifsc: form.ifsc,
        accountHolder: form.accountName,
      });

      setVerifying(false);
      setVerified(true);

      const newAccount: BankAccount = {
        id: res.data?.id || Math.random().toString(36).slice(2),
        accountName: form.accountName,
        accountNumber: `XXXX${form.accountNumber.slice(-4)}`,
        ifsc: form.ifsc.toUpperCase(),
        bankName: form.bankName,
        isPrimary: accounts.length === 0,
        verified: true,
      };

      setAccounts([...accounts, newAccount]);
      setShowForm(false);
      setForm({ accountName: "", accountNumber: "", confirmAccountNumber: "", ifsc: "", bankName: "" });
      setVerified(false);
    } catch (e: any) {
      console.error(e);
      setVerifying(false);
      setError(e?.response?.data?.message || "Verification failed. Please check your details.");
    }
  };

  const setPrimary = (id: string) => {
    setAccounts(accounts.map((a) => ({ ...a, isPrimary: a.id === id })));
  };

  const removeAccount = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/onboarding/documents" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="w-4 h-4" /> Back to documents
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Bank Account</h1>
        <p className="text-gray-500 mt-1">Link your bank account for settlement payouts</p>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Linked Accounts</h2>
          {accounts.map((acc) => (
            <Card key={acc.id} className={acc.isPrimary ? "border-blue-200 bg-blue-50/50" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{acc.bankName}</p>
                    {acc.isPrimary && <Badge variant="info">Primary</Badge>}
                    {acc.verified && <Badge variant="success">Verified</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">{acc.accountName} - {acc.accountNumber}</p>
                  <p className="text-xs text-gray-400">IFSC: {acc.ifsc}</p>
                </div>
                <div className="flex gap-1">
                  {!acc.isPrimary && (
                    <button
                      onClick={() => setPrimary(acc.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition"
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeAccount(acc.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Bank Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddBank} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Account holder name</label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Account number</label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirm account number</label>
                  <input
                    type="text"
                    value={form.confirmAccountNumber}
                    onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">IFSC code</label>
                  <input
                    type="text"
                    value={form.ifsc}
                    onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HDFC0001234"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Bank name</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {verifying && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Verifying account...</p>
                    <p className="text-xs text-blue-600">Performing penny-drop verification</p>
                  </div>
                </div>
              )}

              {verified && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700 font-medium">Account verified successfully!</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                {accounts.length > 0 && (
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Done
                  </Button>
                )}
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white" disabled={verifying}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {verifying ? "Verifying..." : "Verify & Add Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Another Account
          </Button>
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">
              Complete Onboarding
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
