"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Palette, FileText, Languages, DollarSign, CreditCard, Bell,
  Check, Eye, Save, Upload, Loader2,
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

const defaultNotifEvents = [
  { event: "Payment successful", email: true, sms: true },
  { event: "Refund issued", email: true, sms: false },
  { event: "Dispute created", email: true, sms: true },
  { event: "Payout sent", email: true, sms: false },
  { event: "Payment failed", email: false, sms: false },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("branding");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const [logo, setLogo] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#6C5CE7");
  const [font, setFont] = useState("Inter");

  const [currency, setCurrency] = useState("USD ($)");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [language, setLanguage] = useState("English (EN)");
  const [numberFormat, setNumberFormat] = useState("1,234.56");

  const [mdr, setMdr] = useState(2.0);
  const [fixedFee, setFixedFee] = useState(5);
  const [internationalMarkup, setInternationalMarkup] = useState(1.5);

  const [paymentMethods, setPaymentMethods] = useState([
    { name: "Cards", enabled: true },
    { name: "UPI", enabled: true },
    { name: "Net Banking", enabled: true },
    { name: "Wallet", enabled: true },
    { name: "EMI", enabled: true },
  ]);
  const [preFill, setPreFill] = useState(true);
  const [saveCard, setSaveCard] = useState(true);
  const [redirectUrls, setRedirectUrls] = useState("https://myapp.com/success, https://myapp.com/cancel");

  const [notifEvents, setNotifEvents] = useState(defaultNotifEvents);
  const [customCopy, setCustomCopy] = useState("");

  const [receiptFields, setReceiptFields] = useState(JSON.stringify({ order_id: "", gst_number: "", return_policy: "" }, null, 2));
  const [emailReceiptTemplate, setEmailReceiptTemplate] = useState("Default");
  const [pdfReceiptTemplate, setPdfReceiptTemplate] = useState("Default");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get<any>("/settings");
        const s = res;
        setBrandColor(s.branding?.brandColor || "#6C5CE7");
        setFont(s.branding?.font || "Inter");
        setLogo(s.branding?.logo || null);
        setCurrency(s.settings?.currency || "USD ($)");
        setDateFormat(s.settings?.dateFormat || "MM/DD/YYYY");
        setLanguage(s.settings?.language || "English (EN)");
        setNumberFormat(s.settings?.numberFormat || "1,234.56");
        setMdr(s.fees?.mdr ?? 2.0);
        setFixedFee(s.fees?.fixedFee ?? 5);
        setInternationalMarkup(s.fees?.internationalMarkup ?? 1.5);
        if (s.checkout?.paymentMethods) setPaymentMethods(s.checkout.paymentMethods);
        setPreFill(s.checkout?.preFill ?? true);
        setSaveCard(s.checkout?.saveCard ?? true);
        setRedirectUrls(s.checkout?.redirectUrls || "https://myapp.com/success, https://myapp.com/cancel");
        if (s.customerNotifications?.events) setNotifEvents(s.customerNotifications.events);
        setCustomCopy(s.customerNotifications?.customCopy || "");
      } catch (err) {
        console.error("Settings fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const res = await api.post<any>("/settings/branding/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogo(res.url);
    } catch (err) {
      console.error("Logo upload error:", err);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      await api.put("/settings/branding", { logo, brandColor, font });
      showSaved();
    } catch (err) {
      console.error("Save branding error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put("/settings/settings", { currency, dateFormat, language, numberFormat });
      showSaved();
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFees = async () => {
    setSaving(true);
    try {
      await api.put("/settings/fees", { mdr, fixedFee, internationalMarkup });
      showSaved();
    } catch (err) {
      console.error("Save fees error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCheckout = async () => {
    setSaving(true);
    try {
      await api.put("/settings/checkout", { paymentMethods, preFill, saveCard, redirectUrls });
      showSaved();
    } catch (err) {
      console.error("Save checkout error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await api.put("/settings/customer-notifications", { events: notifEvents, customCopy });
      showSaved();
    } catch (err) {
      console.error("Save notifications error:", err);
    } finally {
      setSaving(false);
    }
  };

  const feePreview = (amount: number) => {
    const fee = (amount * mdr) / 100 + fixedFee;
    return fee.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

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
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed overflow-hidden">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <label htmlFor="logo-upload">
                  <span className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 cursor-pointer">
                    Upload Logo
                  </span>
                </label>
                <input id="logo-upload" type="file" accept="image/png,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                <p className="text-xs text-gray-500 mt-1">PNG, SVG. Max 2MB. 512x512px recommended.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand color</label>
                <div className="flex gap-2">
                  <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="flex-1 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Font</label>
                <Select value={font} onChange={(e) => setFont(e.target.value)}>
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Open Sans</option>
                  <option>Poppins</option>
                </Select>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 border">
              <p className="text-sm font-medium mb-2">Preview</p>
              <div className="bg-white rounded-lg border p-4" style={{ fontFamily: font }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: brandColor }} />
                  <span className="font-bold">Your Brand</span>
                </div>
                <p className="text-sm text-gray-600">This is how your payment page will look with your branding.</p>
                <div className="mt-3 flex gap-2">
                  <div className="flex-1 h-8 rounded" style={{ backgroundColor: brandColor }} />
                  <div className="flex-1 h-8 rounded border" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveBranding} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving</> : saved ? <><Check className="w-4 h-4 mr-1" /> Saved</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
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
                  value={receiptFields}
                  onChange={(e) => setReceiptFields(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email receipt template</label>
                <select value={emailReceiptTemplate} onChange={(e) => setEmailReceiptTemplate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option>Default</option>
                  <option>Minimal</option>
                  <option>Detailed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PDF receipt template</label>
                <select value={pdfReceiptTemplate} onChange={(e) => setPdfReceiptTemplate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
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
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option>USD ($)</option>
                  <option>INR (₹)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date format</label>
                <Select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment page language</label>
                <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {locales.map((l) => (<option key={l.code}>{l.label} ({l.code})</option>))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number format</label>
                <Select value={numberFormat} onChange={(e) => setNumberFormat(e.target.value)}>
                  <option>1,234.56</option>
                  <option>1.234,56</option>
                  <option>1 234,56</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveSettings} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
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
                <Input type="number" value={mdr} onChange={(e) => setMdr(Number(e.target.value))} step="0.1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fixed fee ($)</label>
                <Input type="number" value={fixedFee} onChange={(e) => setFixedFee(Number(e.target.value))} step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">International markup (%)</label>
                <Input type="number" value={internationalMarkup} onChange={(e) => setInternationalMarkup(Number(e.target.value))} step="0.1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fee preview</label>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  $100.00 charge = <strong>${feePreview(100)}</strong> fee
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveFees} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
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
                {paymentMethods.map((pm, i) => (
                  <div key={pm.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm text-gray-400 w-6">{i + 1}</span>
                    <span className="flex-1 font-medium">{pm.name}</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={pm.enabled} onChange={(e) => {
                        const updated = [...paymentMethods];
                        updated[i] = { ...updated[i], enabled: e.target.checked };
                        setPaymentMethods(updated);
                      }} className="rounded" /> Enabled
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={preFill} onChange={(e) => setPreFill(e.target.checked)} className="rounded" /> Pre-fill customer details
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="rounded" /> Show save-card option
              </label>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Custom redirect URLs (comma-separated)</label>
                <Input value={redirectUrls} onChange={(e) => setRedirectUrls(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveCheckout} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "notifications" && (
        <Card>
          <CardHeader><CardTitle>Customer Notification Config</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {notifEvents.map((n, i) => (
                <div key={n.event} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm font-medium">{n.event}</span>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={n.email} onChange={(e) => {
                        const updated = [...notifEvents];
                        updated[i] = { ...updated[i], email: e.target.checked };
                        setNotifEvents(updated);
                      }} className="rounded" /> Email
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={n.sms} onChange={(e) => {
                        const updated = [...notifEvents];
                        updated[i] = { ...updated[i], sms: e.target.checked };
                        setNotifEvents(updated);
                      }} className="rounded" /> SMS
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom email copy</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={customCopy} onChange={(e) => setCustomCopy(e.target.value)} placeholder="Override default email templates..." />
            </div>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveNotifications} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
