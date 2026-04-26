import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Specwright — AI-powered E2E test automation",
  description:
    "Specwright explores your app, writes production-grade BDD tests, and self-heals failures — all running locally inside Claude Code.",
  keywords: ["playwright", "bdd", "e2e testing", "claude", "ai testing", "specwright"],
  openGraph: {
    title: "Specwright — AI-powered E2E tests",
    description: "10-phase AI pipeline. Production BDD tests. Self-healing. Zero SaaS.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-950 text-white" suppressHydrationWarning>{children}</body>
    </html>
  );
}
