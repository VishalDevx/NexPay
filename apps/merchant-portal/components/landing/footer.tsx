"use client";

import { useState } from "react";
import Link from "next/link";
import { Github, Twitter, Linkedin, Mail, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "API Reference", href: "https://docs.nexpay.com/api" },
    { label: "Changelog", href: "https://docs.nexpay.com/changelog" },
    { label: "Status", href: "https://status.nexpay.com" },
  ],
  Resources: [
    { label: "Documentation", href: "https://docs.nexpay.com" },
    { label: "SDKs & Libraries", href: "https://docs.nexpay.com/sdks" },
    { label: "Postman Collection", href: "https://postman.nexpay.com" },
    { label: "Sample Apps", href: "https://github.com/nexpay" },
    { label: "Bug Bounty", href: "https://nexpay.com/bug-bounty" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Partners", href: "#" },
  ],
  Legal: [
    { label: "Terms of Service", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "DPA", href: "#" },
    { label: "GDPR", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-white font-semibold text-lg">NexPay</span>
            </Link>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">
              Payment infrastructure for the internet. Multi-currency, fraud detection, and settlement.
            </p>
            <div className="flex gap-3">
              <a href="https://github.com/nexpay" className="text-gray-500 hover:text-white transition">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/nexpay" className="text-gray-500 hover:text-white transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/nexpay" className="text-gray-500 hover:text-white transition">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="mailto:hello@nexpay.com" className="text-gray-500 hover:text-white transition">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-500 hover:text-gray-300 text-sm transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-md w-full">
            <h4 className="text-white text-sm font-semibold mb-2">Stay in the loop</h4>
            <p className="text-gray-500 text-xs mb-3">
              Product updates, engineering deep-dives, and payment industry insights.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 text-white shrink-0">
                {subscribed ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} NexPay, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
