import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NexPay | Admin Panel",
  description: "Internal admin control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen antialiased">{children}</body>
    </html>
  );
}
