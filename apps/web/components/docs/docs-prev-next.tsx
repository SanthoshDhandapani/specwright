"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPrevNext } from "@/lib/docs-nav";

export function DocsPrevNext() {
  const pathname = usePathname();
  const { prev, next } = getPrevNext(pathname);

  if (!prev && !next) return null;

  return (
    <div className="flex justify-between gap-4 mt-16 pt-8 border-t border-slate-800">
      {prev ? (
        <Link href={prev.href} className="group flex flex-col gap-1 text-left max-w-[45%]">
          <span className="text-xs text-slate-500 uppercase tracking-wider">← Previous</span>
          <span className="text-sm text-slate-300 group-hover:text-violet-300 transition-colors">
            {prev.label}
          </span>
        </Link>
      ) : <div />}
      {next && (
        <Link href={next.href} className="group flex flex-col gap-1 text-right max-w-[45%] ml-auto">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Next →</span>
          <span className="text-sm text-slate-300 group-hover:text-violet-300 transition-colors">
            {next.label}
          </span>
        </Link>
      )}
    </div>
  );
}
