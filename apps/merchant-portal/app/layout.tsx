import "./globals.css";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NexPay | Payment Infrastructure for the Internet",
  description:
    "Multi-currency payments, immutable double-entry ledger, fraud detection, webhook delivery, and merchant settlement — one API. Start for free.",
  keywords: [
    "payment gateway",
    "multi-currency",
    "fraud detection",
    "payment API",
    "merchant services",
    "fintech",
    "NexPay",
  ],
  openGraph: {
    title: "NexPay | Payment Infrastructure for the Internet",
    description:
      "Multi-currency payments, immutable double-entry ledger, fraud detection, webhook delivery, and merchant settlement — one API.",
    type: "website",
    siteName: "NexPay",
  },
  twitter: {
    card: "summary_large_image",
    title: "NexPay | Payment Infrastructure for the Internet",
    description:
      "Multi-currency payments, immutable double-entry ledger, fraud detection, webhook delivery, and merchant settlement — one API.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
