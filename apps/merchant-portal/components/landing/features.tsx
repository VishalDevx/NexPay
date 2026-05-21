import {
  Globe,
  BookOpen,
  ShieldAlert,
  Webhook,
  Beaker,
  Banknote,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Multi-currency",
    description: "Accept and settle in 50+ currencies with live FX rates. Auto-conversion at checkout.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: BookOpen,
    title: "Double-entry ledger",
    description: "Immutable audit trail with matching debit/credit pairs. Tamper-proof by design.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: ShieldAlert,
    title: "Fraud engine",
    description: "Velocity checks, IP intelligence, device fingerprinting, and ML scoring in real-time.",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Event-driven delivery with HMAC signing, retry logic, and dead-letter queue.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Beaker,
    title: "Sandbox environment",
    description: "Isolated test mode with simulated card numbers, event simulators, and resetable data.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Banknote,
    title: "Payout engine",
    description: "Automated batch settlements, instant payouts, and multi-bank routing.",
    gradient: "from-violet-500 to-fuchsia-500",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-slate-900 py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything you need to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              accept payments
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A complete payment infrastructure platform. No third-party dependencies, no hidden costs.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} p-2.5 mb-4 shadow-lg`}>
                <f.icon className="w-full h-full text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
