import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NexPay | Admin Panel",
  description: "Internal admin control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
