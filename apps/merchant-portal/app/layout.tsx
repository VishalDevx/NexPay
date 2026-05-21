import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NexPay | Merchant Portal",
  description: "Payment gateway merchant portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen antialiased">{children}</body>
    </html>
  );
}
