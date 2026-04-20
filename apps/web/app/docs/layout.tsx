import Link from "next/link";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-bold tracking-widest uppercase bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
              ⚡ Specwright
            </span>
            <span className="text-slate-600 text-sm hidden sm:block">/</span>
            <span className="text-slate-400 text-sm hidden sm:block">Docs</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/docs/getting-started/introduction" className="text-slate-400 hover:text-slate-200 transition-colors hidden md:block">
              Getting Started
            </Link>
            <Link href="/docs/core-concepts/pipeline" className="text-slate-400 hover:text-slate-200 transition-colors hidden md:block">
              Pipeline
            </Link>
            <a
              href="https://github.com/specwright/specwright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              GitHub ↗
            </a>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors text-xs"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <DocsMobileNav />

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 flex gap-10">
        <DocsSidebar />
        <main className="flex-1 min-w-0 py-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
