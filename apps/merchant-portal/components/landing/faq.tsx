"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does NexPay ensure PCI-DSS compliance?",
    a: "Card data never touches your server. Our hosted fields (iframe) handle all card data collection. We tokenize every card number—you store and reuse tokens. We are PCI-DSS Level 1 compliant, audited annually by a QSA. Vault-stored tokens are encrypted with AES-256 and HSM-backed keys.",
  },
  {
    q: "What uptime SLA does NexPay guarantee?",
    a: "We guarantee 99.99% uptime for our API, webhook delivery, and payment processing services. Our Enterprise plan includes a dedicated SLA with service credits for breaches. We measure uptime monthly and publish real-time status at status.nexpay.com.",
  },
  {
    q: "How does the double-entry ledger work?",
    a: "Every financial event creates a matching debit-credit pair across different accounts (ASSET, REVENUE, LIABILITY, EXPENSE, EQUITY). All entries are immutable—once written, they cannot be altered. The ledger supports balance sheet queries, audit trails, and reconciliation. Each entry stores balanceAfter for point-in-time snapshots.",
  },
  {
    q: "What fraud prevention measures are included?",
    a: "Our fraud engine runs 6+ rules in real-time: velocity checks, geographic anomaly detection, amount deviation analysis, device fingerprinting, IP intelligence (Tor/VPN detection), and high-risk currency flags. Each rule is configurable with custom weights. Score >= 80 auto-declines, >= 50 flags for review. ML model integration is available for Enterprise.",
  },
  {
    q: "Can I test the platform before going live?",
    a: "Yes! Our sandbox environment is fully isolated from production. Use test card numbers (4242... = success, 4000...0002 = decline, etc.) to simulate any scenario. The event simulator lets you trigger disputes, chargebacks, and payout failures. Sandbox data is resetable and completely separate from live data.",
  },
  {
    q: "What is your refund policy?",
    a: "Full and partial refunds are supported via API and dashboard. Refunds settle immediately to the customer's card (typically 5-10 business days). The refunded amount is deducted from your NexPay balance and a matching ledger entry is created. Refund fees are not charged for legitimate refunds.",
  },
  {
    q: "How do webhooks work?",
    a: "Webhooks are delivered via HTTP POST to your configured endpoint URL. Every payload is signed with HMAC-SHA256 (X-NexPay-Signature header). Failed deliveries retry at 1s, 4s, 16s, 64s, 256s intervals. After 5 failures, the event moves to the dead-letter queue. Endpoints auto-pause after threshold failures. You can manually replay from the dashboard.",
  },
  {
    q: "What payment methods do you support?",
    a: "We support Visa, Mastercard, American Express, UPI (GPay, PhonePe, Paytm), Net Banking (50+ Indian banks), EMI (no-cost & standard), Paytm Wallet, Amazon Pay, and Mobikwik. Payment Links and Hosted Payment Pages are available for no-code checkout. Subscriptions with e-NACH and card-on-file mandates are supported.",
  },
  {
    q: "How is data encrypted?",
    a: "All data is encrypted at rest using AES-256 with envelope encryption (per-merchant keys). Transit encryption uses TLS 1.3. Key rotation is scheduled and automated. HSM-backed key storage is available for Enterprise. We also support customer-managed encryption keys on request.",
  },
  {
    q: "How does settlement work?",
    a: "Settlements are processed on a daily, weekly, or monthly schedule (configurable). Minimum payout threshold is configurable. Funds are transferred to your linked bank account via NEFT/IMPS/RTGS (India) or ACH (US). Each payout includes a detailed settlement breakdown: gross amount, fees deducted, dispute reserves, and net payout.",
  },
  {
    q: "What is the idempotency key and why should I use it?",
    a: "The Idempotency-Key header ensures that retrying a request does not create duplicate charges. We store the response for 24 hours using a distributed Redis lock. If the same key is sent again, the original response is returned. This is critical for network failures—safely retry without worrying about double-charging customers.",
  },
  {
    q: "Do you offer volume discounts?",
    a: "Yes. Our Growth plan offers reduced per-transaction fees. Enterprise plans have completely custom pricing based on volume, payment methods, and infrastructure requirements. Contact our sales team for a tailored quote. We also offer revenue-sharing models for platforms and marketplaces.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-slate-900 py-24 border-t border-slate-800">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Frequently asked{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              questions
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Everything you need to know about NexPay. Can&apos;t find what you&apos;re looking for?{" "}
            <a href="#" className="text-blue-400 hover:underline">Contact us</a>.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left transition"
              >
                <span className="text-white font-medium text-sm pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4">
                  <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
