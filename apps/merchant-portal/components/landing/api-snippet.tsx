"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const curlSnippet = `curl -X POST https://api.nexpay.com/v1/payments/charges \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890" \\
  -d '{
    "amount": 24900,
    "currency": "usd",
    "card": {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2027,
      "cvc": "123"
    },
    "description": "Premium plan subscription",
    "metadata": {
      "order_id": "ORD-2024-001"
    }
  }'`;

export default function ApiSnippet() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(curlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-slate-900 py-24 border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-blue-300 text-sm font-medium">Developer-first</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            One API.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Infinite possibilities.
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Idempotent, idempotent, idempotent. Every charge request is safe to retry.
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition" />
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-900/50 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-gray-500 text-xs ml-3 font-mono">charge.sh</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-2 py-1 rounded-md hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-5 overflow-x-auto">
              <code className="text-sm leading-relaxed font-mono">
                <span className="text-gray-400"># Create a charge with idempotency key</span>
                {"\n"}
                <span className="text-pink-400">curl</span>
                <span className="text-gray-300"> -X POST </span>
                <span className="text-emerald-400">https://api.nexpay.com/v1/payments/charges</span>
                {" \\\n"}
                <span className="text-gray-300">  -H </span>
                <span className="text-amber-300">&quot;Authorization: Bearer sk_live_...&quot;</span>
                {" \\\n"}
                <span className="text-gray-300">  -H </span>
                <span className="text-amber-300">&quot;Content-Type: application/json&quot;</span>
                {" \\\n"}
                <span className="text-gray-300">  -H </span>
                <span className="text-amber-300">&quot;Idempotency-Key: <span className="text-blue-300">a1b2c3d4-e5f6-7890-abcd-ef1234567890</span>&quot;</span>
                {" \\\n"}
                <span className="text-gray-300">  -d </span>
                <span className="text-amber-300">&apos;</span>
                {"\n"}
                <span className="text-gray-300">  </span>
                <span className="text-purple-400">-d</span>
                <span className="text-gray-300"> </span>
                <span className="text-amber-300">'{"{"}</span>
                {"\n"}
                <span className="text-gray-300">    </span>
                <span className="text-red-300">&quot;amount&quot;</span>
                <span className="text-gray-300">: </span>
                <span className="text-emerald-300">24900</span>
                <span className="text-gray-300">,</span>
                {"\n"}
                <span className="text-gray-300">    </span>
                <span className="text-red-300">&quot;currency&quot;</span>
                <span className="text-gray-300">: </span>
                <span className="text-amber-300">&quot;usd&quot;</span>
                <span className="text-gray-300">,</span>
                {"\n"}
                <span className="text-gray-300">    </span>
                <span className="text-red-300">&quot;card&quot;</span>
                <span className="text-gray-300">: </span>
                <span className="text-amber-300">{"{"}</span>
                {"\n"}
                <span className="text-gray-300">      </span>
                <span className="text-red-300">&quot;number&quot;</span>
                <span className="text-gray-300">: </span>
                <span className="text-amber-300">&quot;4242••••4242&quot;</span>
                <span className="text-gray-300">,</span>
                {"\n"}
                <span className="text-gray-300">      </span>
                <span className="text-red-300">&quot;exp_month&quot;</span>
                <span className="text-gray-300">: </span>
                <span className="text-emerald-300">12</span>
                <span className="text-gray-300">,</span>
                {"\n"}
                <span className="text-gray-300">      </span>
                <span className="text-red-300">&quot;exp_year&quot;</span>
                <span className="text-gray-300">: </span>
                <span className="text-emerald-300">2027</span>
                {"\n"}
                <span className="text-gray-300">    </span>
                <span className="text-amber-300">{"}"}</span>
                <span className="text-gray-300">,</span>
                {"\n"}
                <span className="text-gray-300">    </span>
                <span className="text-red-300">&quot;description&quot;</span>
                <span className="text-gray-300">: </span>
                <span className="text-amber-300">&quot;Premium plan subscription&quot;</span>
                {"\n"}
                <span className="text-gray-300">  </span>
                <span className="text-amber-300">{"}"}'</span>
              </code>
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mt-8 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Idempotent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Idempotent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Idempotent
          </span>
        </div>
      </div>
    </section>
  );
}
