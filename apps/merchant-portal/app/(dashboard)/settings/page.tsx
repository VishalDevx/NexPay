"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Palette, FileText, Languages, DollarSign, CreditCard, Bell,
  Check, Eye, Save, Upload,
} from "lucide-react";

const locales = [
  { code: "EN", label: "English" },
  { code: "HI", label: "Hindi" },
  { code: "TA", label: "Tamil" },
  { code: "FR", label: "French" },
  { code: "DE", label: "German" },
  { code: "ES", label: "Spanish" },
  { code: "PT", label: "Portuguese" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("branding");
  const [saved, setSaved] = useState(false);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Customize your merchant account</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {[
          { id: "branding", label: "Branding", icon: Palette },
          { id: "receipts", label: "Receipts", icon: FileText },
          { id: "locale", label: "Locale", icon: Languages },
          { id: "fees", label: "Fees", icon: DollarSign },
          { id: "checkout", label: "Checkout", icon: CreditCard },
          { id: "notifications", label: "Notifications", icon: Bell },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                activeSection === s.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {activeSection === "branding" && (
        <Card>
          <CardHeader><CardTitle>Branding / White-Label</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <Button variant="outline" size="sm">Upload Logo</Button>
                <p className="text-xs text-gray-500 mt-1">PNG, SVG. Max 2MB. 512x512px recommended.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand color</label>
                <div className="flex gap-2">
                  <input type="color" defaultValue="#2563eb" className="w-10 h-10 rounded border cursor-pointer" />
                  <Input defaultValue="#2563eb" className="flex-1 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Font</label>
                <Select>
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Open Sans</option>
                  <option>Poppins</option>
                </Select>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 border">
              <p className="text-sm font-medium mb-2">Preview</p>
              <div className="bg-white rounded-lg border p-4" style={{ fontFamily: "Inter" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: "#2563eb" }} />
                  <span className="font-bold">Your Brand</span>
                </div>
                <p className="text-sm text-gray-600">This is how your payment page will look with your branding.</p>
                <div className="mt-3 flex gap-2">
                  <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#2563eb" }} />
                  <div className="flex-1 h-8 rounded border" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={showSaved}>
                {saved ? <><Check className="w-4 h-4 mr-1" /> Saved</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "receipts" && (
        <Card>
          <CardHeader><CardTitle>Custom Receipt Templates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Custom fields (JSON)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  rows={5}
                  defaultValue={JSON.stringify({ order_id: "", gst_number: "", return_policy: "" }, null, 2)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email receipt template</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option>Default</option>
                  <option>Minimal</option>
                  <option>Detailed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PDF receipt template</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option>Default</option>
                  <option>Invoice-style</option>
                  <option>Tax receipt</option>
                </select>
              </div>
            </div>
            <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Preview</Button>
          </CardContent>
        </Card>
      )}

      {activeSection === "locale" && (
        <Card>
          <CardHeader><CardTitle>Locale & Currency Config</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Default display currency</label>
                <Select>
                  <option>USD ($)</option>
                  <option>INR (₹)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date format</label>
                <Select>
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment page language</label>
                <Select>
                  {locales.map((l) => (<option key={l.code}>{l.label} ({l.code})</option>))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number format</label>
                <Select>
                  <option>1,234.56</option>
                  <option>1.234,56</option>
                  <option>1 234,56</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "fees" && (
        <Card>
          <CardHeader><CardTitle>Fee Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800">Current pricing: Growth plan</p>
              <p className="text-xs text-blue-600">2.5% + $0.25 per transaction · $99/month</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">MDR (%)</label>
                <Input type="number" defaultValue="2.5" step="0.1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fixed fee ($)</label>
                <Input type="number" defaultValue="0.25" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">International markup (%)</label>
                <Input type="number" defaultValue="1.0" step="0.1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fee preview</label>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  $100.00 charge = <strong>$2.75</strong> fee
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "checkout" && (
        <Card>
          <CardHeader><CardTitle>Checkout Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">Payment methods order</p>
              <div className="space-y-2">
                {["Cards", "UPI", "Net Banking", "Wallet", "EMI"].map((pm, i) => (
                  <div key={pm} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm text-gray-400 w-6">{i + 1}</span>
                    <span className="flex-1 font-medium">{pm}</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked className="rounded" /> Enabled
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" /> Pre-fill customer details
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" /> Show save-card option
              </label>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Custom redirect URLs (comma-separated)</label>
                <Input defaultValue="https://myapp.com/success, https://myapp.com/cancel" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "notifications" && (
        <Card>
          <CardHeader><CardTitle>Customer Notification Config</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { event: "Payment successful", email: true, sms: true },
                { event: "Refund issued", email: true, sms: false },
                { event: "Dispute created", email: true, sms: true },
                { event: "Payout sent", email: true, sms: false },
                { event: "Payment failed", email: false, sms: false },
              ].map((n) => (
                <div key={n.event} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm font-medium">{n.event}</span>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" defaultChecked={n.email} className="rounded" /> Email
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" defaultChecked={n.sms} className="rounded" /> SMS
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom email copy</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Override default email templates..." />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
