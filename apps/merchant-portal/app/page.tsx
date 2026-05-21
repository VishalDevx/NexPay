import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col">
      <nav className="px-6 py-5 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-white font-semibold text-xl">NexPay</span>
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
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Payment infrastructure<br />
              <span className="text-blue-400">built for scale</span>
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-xl">
              Multi-currency payments, immutable double-entry ledger, fraud detection,
              webhook delivery, and merchant settlement — one API.
            </p>

            <div className="flex gap-4 mb-16">
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition shadow-lg shadow-blue-600/25"
              >
                Start with Sandbox
              </Link>
              <Link
                href="/login"
                className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-3 rounded-xl font-medium transition"
              >
                Merchant Login
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { label: "Payments Processed", value: "$2.4M+" },
              { label: "Uptime SLA", value: "99.99%" },
              { label: "Avg. Latency", value: "< 50ms" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex justify-between items-center">
            <div className="flex gap-6">
              <Link
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-300 transition"
              >
                Merchant Portal
              </Link>
              <a
                href="http://localhost:3002"
                className="text-sm text-gray-500 hover:text-gray-300 transition"
              >
                Admin Panel
              </a>
            </div>
            <p className="text-xs text-gray-600">2026 NexPay. Fintech infrastructure.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
