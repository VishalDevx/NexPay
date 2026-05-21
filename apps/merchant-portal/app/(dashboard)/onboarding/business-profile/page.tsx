"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mccCodes = [
  { code: "5734", label: "Computer Software Stores" },
  { code: "5812", label: "Eating Places & Restaurants" },
  { code: "5813", label: "Drinking Places" },
  { code: "5944", label: "Jewelry Stores" },
  { code: "5999", label: "Miscellaneous Retail" },
  { code: "7399", label: "Business Services" },
  { code: "7829", label: "Motion Picture Production" },
  { code: "7995", label: "Betting & Gambling" },
  { code: "8099", label: "Medical Services" },
  { code: "8299", label: "Educational Services" },
];

export default function BusinessProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    legalName: "",
    registrationNumber: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    website: "",
    mccCode: "",
    expectedMonthlyVolume: "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/merchants/profile", {
        legalName: form.legalName,
        registrationNumber: form.registrationNumber,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        website: form.website,
        mccCode: form.mccCode,
        expectedMonthlyVolume: form.expectedMonthlyVolume,
      });
      setLoading(false);
      setSaved(true);
      setTimeout(() => router.push("/onboarding/documents"), 1000);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/onboarding" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="w-4 h-4" /> Back to onboarding
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Business Profile</h1>
        <p className="text-gray-500 mt-1">Tell us about your business</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Legal business name</label>
                <input
                  type="text"
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Registration / Tax number</label>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="GSTIN / EIN / VAT ID"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Business address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">State / Province</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">ZIP / Postal code</label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">MCC code (business category)</label>
                <select
                  value={form.mccCode}
                  onChange={(e) => setForm({ ...form, mccCode: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  {mccCodes.map((m) => (
                    <option key={m.code} value={m.code}>{m.code} - {m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Expected monthly volume</label>
                <select
                  value={form.expectedMonthlyVolume}
                  onChange={(e) => setForm({ ...form, expectedMonthlyVolume: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select volume</option>
                  <option value="<10k">Less than $10,000</option>
                  <option value="10k-50k">$10,000 - $50,000</option>
                  <option value="50k-250k">$50,000 - $250,000</option>
                  <option value="250k-1m">$250,000 - $1,000,000</option>
                  <option value=">1m">More than $1,000,000</option>
                </select>
              </div>
            </div>

            {saved && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-emerald-700 text-sm font-medium">Saved! Redirecting to document upload...</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/onboarding">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
