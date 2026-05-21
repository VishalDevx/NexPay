"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Shield, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

function AnimatedPaymentFlow() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: "Checkout", color: "bg-blue-500" },
    { label: "Processing", color: "bg-amber-500" },
    { label: "Authorized", color: "bg-indigo-500" },
    { label: "Captured", color: "bg-emerald-500" },
  ];

  useEffect(() => {
    const t = setInterval(() => setStep((p) => (p + 1) % steps.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">N</span>
            </div>
            <span className="text-white text-sm font-medium">NexPay Checkout</span>
          </div>
          <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Amount</span>
            <span className="text-white font-medium">$249.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Currency</span>
            <span className="text-white font-medium">USD</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {steps[step].label}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s.label} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.color} ${
                  i <= step ? "opacity-100" : "opacity-0"
                }`}
                style={{ width: i <= step ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        {step >= 3 && (
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300">
            <Check className="w-4 h-4" />
            Payment successful
          </div>
        )}
      </div>
      <div className="absolute -top-3 -right-3 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-500" />
    </div>
  );
}

const trustBadges = [
  { name: "PCI-DSS", icon: Shield, desc: "Level 1" },
  { name: "SOC 2", icon: Shield, desc: "Type II" },
  { name: "ISO 27001", icon: Shield, desc: "Certified" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0wIDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

      <nav className="relative px-6 py-5 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-white font-semibold text-xl">NexPay</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-sm text-gray-400 hover:text-white transition">Features</Link>
          <Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition">Pricing</Link>
          <Link href="#faq" className="text-sm text-gray-400 hover:text-white transition">FAQ</Link>
          <Link href="https://docs.nexpay.com" className="text-sm text-gray-400 hover:text-white transition">Docs</Link>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-300 hover:text-white px-4 py-2 rounded-lg transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-blue-600/25"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-sm font-medium">Now in public beta</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Payment infrastructure{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                built for scale
              </span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-lg leading-relaxed">
              Multi-currency payments, immutable double-entry ledger, fraud detection,
              webhook delivery, and merchant settlement — all through a single API.
            </p>
            <div className="flex gap-4 mb-12 flex-wrap">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25">
                  Start for free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="https://docs.nexpay.com">
                <Button size="lg" variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500">
                  View docs
                </Button>
              </Link>
            </div>
            <div className="flex gap-6">
              {trustBadges.map((b) => (
                <div key={b.name} className="flex items-center gap-2">
                  <b.icon className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-white text-sm font-medium">{b.name}</p>
                    <p className="text-gray-500 text-xs">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <AnimatedPaymentFlow />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-20">
          {[
            { value: "$2.4M+", label: "Payments Processed" },
            { value: "99.99%", label: "Uptime SLA" },
            { value: "< 50ms", label: "Avg. Latency" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 hover:bg-white/10 transition"
            >
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
