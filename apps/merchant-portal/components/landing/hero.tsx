"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function AnimatedPaymentFlow() {
  const [step, setStep] = useState(0);
  const steps = ["Checkout", "Processing", "Authorized", "Captured"];

  useEffect(() => {
    const t = setInterval(() => setStep((p) => (p + 1) % steps.length), 1400);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-white/90">Payment</span>
        <span className="text-xs text-white/50">{steps[step]}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-white">$249.00</p>
      <div className="mt-4 flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full bg-white transition-all duration-500 ${i <= step ? "w-full" : "w-0"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-[#09090b] text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
            <span className="text-xs font-bold text-black">N</span>
          </div>
          <span className="text-sm font-semibold">NexPay</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-[13px] text-white/60 hover:text-white transition">Features</Link>
          <Link href="#pricing" className="text-[13px] text-white/60 hover:text-white transition">Pricing</Link>
          <Link href="#faq" className="text-[13px] text-white/60 hover:text-white transition">FAQ</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-1.5 text-[13px] text-white/70 hover:text-white transition">
            Sign in
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-white text-black hover:bg-white/90 h-8">
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-2 lg:pt-28">
        <div>
          <p className="mb-4 text-[13px] font-medium text-white/50">Payment infrastructure</p>
          <h1 className="text-4xl font-semibold tracking-tight leading-[1.1] sm:text-5xl lg:text-[3.25rem] text-balance">
            Accept payments with clarity
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
            Multi-currency payments, ledger, fraud detection, and settlement — one API, one dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-white/90 gap-2">
                Start for free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/5">
                View dashboard
              </Button>
            </Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <AnimatedPaymentFlow />
        </div>
      </div>
    </section>
  );
}
