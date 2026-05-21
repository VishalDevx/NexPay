import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    desc: "Perfect for early-stage startups and side projects.",
    monthlyFee: 0,
    perTxnFee: "2.9% + $0.30",
    features: [
      "Up to $10k monthly volume",
      "Multi-currency payments",
      "Basic fraud detection",
      "Webhook delivery",
      "Sandbox environment",
      "Email support",
    ],
    cta: "Start for free",
    href: "/register",
    featured: false,
  },
  {
    name: "Growth",
    desc: "For growing businesses that need more volume and control.",
    monthlyFee: 99,
    perTxnFee: "2.5% + $0.25",
    features: [
      "Up to $100k monthly volume",
      "Everything in Starter",
      "Advanced fraud engine",
      "Double-entry ledger",
      "API key management (live + test)",
      "Priority support",
      "Custom webhook events",
      "Payout engine",
    ],
    cta: "Start free trial",
    href: "/register",
    featured: true,
  },
  {
    name: "Enterprise",
    desc: "For high-volume platforms with custom requirements.",
    monthlyFee: null,
    perTxnFee: "Custom",
    features: [
      "Unlimited volume",
      "Everything in Growth",
      "Custom fee schedule",
      "Dedicated infrastructure",
      "SLA guarantee (99.99%)",
      "White-label checkout",
      "Sub-merchant management",
      "On-premise deployment option",
      "Dedicated account manager",
      "Custom contract & invoicing",
    ],
    cta: "Contact sales",
    href: "#contact",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-slate-900 py-24 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Simple, transparent{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              pricing
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            No hidden fees, no surprise charges. Pay only for what you use.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                tier.featured
                  ? "bg-gradient-to-b from-blue-600/10 to-indigo-600/5 border-blue-500/30 shadow-xl shadow-blue-500/10 scale-105"
                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{tier.desc}</p>
                <div className="flex items-baseline gap-1">
                  {tier.monthlyFee !== null ? (
                    <>
                      <span className="text-4xl font-bold text-white">${tier.monthlyFee}</span>
                      <span className="text-gray-400 text-sm">/month</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-white">Custom</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">+ {tier.perTxnFee} per transaction</p>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={tier.href}>
                <Button
                  className={`w-full ${
                    tier.featured
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                  size="lg"
                >
                  {tier.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
