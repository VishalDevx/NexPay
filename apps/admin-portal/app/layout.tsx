import "./globals.css";
import { Metadata } from "next";
import AdminProviders from "./providers";

export const metadata: Metadata = {
  title: "NexPay | Admin Panel",
  description: "Internal admin control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}

