"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV } from "@/lib/docs-nav";

export function DocsMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = DOC_NAV.flatMap((g) => g.items).find((i) => i.href === pathname);

  return (
    <div className="lg:hidden border-b border-slate-800 bg-slate-950 px-4 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-slate-300 w-full"
      >
        <span className="flex-1 text-left truncate">{current?.label ?? "Docs"}</span>
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {DOC_NAV.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`block px-2 py-1.5 rounded text-sm ${
                        pathname === item.href
                          ? "text-violet-300 bg-violet-500/10"
                          : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
