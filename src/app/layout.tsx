import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { DataProvider } from "@/lib/data-context";

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
    <html lang="en">
      <body className="bg-[#f8fafc] text-[#1e293b] min-h-screen">
        <DataProvider>
          <Sidebar />
          <Topbar />
          <main className="ml-[240px] mt-14 p-6 bg-mesh min-h-[calc(100vh-56px)]">
            {children}
          </main>
        </DataProvider>
      </body>
    </html>
  );
}
