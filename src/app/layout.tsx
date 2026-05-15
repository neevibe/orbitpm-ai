import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "@/components/layout/ClientShell";

export const metadata: Metadata = {
  title: "OrbitPM AI — Project Governance & Portfolio Intelligence",
  description: "AI-Powered Project Governance & Portfolio Intelligence Platform for Airports and Enterprises",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#f8fafc] text-[#1e293b] min-h-screen" suppressHydrationWarning>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
