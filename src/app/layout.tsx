import type { Metadata } from "next";
import "./globals.css";
import AuthShell from "@/components/layout/AuthShell";

export const metadata: Metadata = {
  title: "Xyrenis — Enterprise Work Operating System",
  description: "AI-Powered Enterprise Work Operating System. Project Governance, Portfolio Intelligence, Workforce Management, and Knowledge Collaboration.",
  keywords: ["project management", "portfolio", "enterprise", "AI", "workforce"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen">
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}
