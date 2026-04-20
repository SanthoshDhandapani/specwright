import React, { useState, useEffect, useRef, useCallback } from "react";

type PaletteItem =
  | { kind: "module";   label: string; arg: string }
  | { kind: "workflow"; label: string; arg: string }
  | { kind: "script";  label: string; arg: string }
  | { kind: "custom";  label: string; arg: string };

const kindMeta: Record<PaletteItem["kind"], { icon: string; badge: string; badgeCls: string; rowHover: string }> = {
  module:   { icon: "▶", badge: "Module",   badgeCls: "text-brand-400 bg-brand-950/60 border-brand-800/40",   rowHover: "hover:bg-slate-800/80" },
  workflow: { icon: "⇄", badge: "Workflow",  badgeCls: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40", rowHover: "hover:bg-slate-800/80" },
  script:   { icon: "≡", badge: "Script",    badgeCls: "text-slate-400 bg-slate-800 border-slate-700",         rowHover: "hover:bg-slate-800/80" },
  custom:   { icon: "↵", badge: "Custom",    badgeCls: "text-amber-400 bg-amber-950/40 border-amber-800/30",   rowHover: "hover:bg-slate-800/80" },
};

export function RunTestsPalette({
  testScripts,
  featureModules,
  onRun,
  onClose,
  inputRef,
}: {
  testScripts: Record<string, string>;
  featureModules: { modules: string[]; workflows: string[] };
  onRun: (arg: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = React.useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = [];
    const allScript = Object.keys(testScripts).find((k) => k === "test:bdd") ?? "test:bdd";
    items.push({ kind: "script", label: "All Tests", arg: allScript });
    for (const dir of featureModules.modules) {
      const label = dir.replace(/^@/, "");
      items.push({ kind: "module", label, arg: `@${label.toLowerCase()}` });
    }
    for (const dir of featureModules.workflows) {
      const label = dir.replace(/^@/, "");
      items.push({ kind: "workflow", label, arg: `@${label.toLowerCase()}` });
    }
    for (const [name, cmd] of Object.entries(testScripts)) {
      if (name === "test:bdd") continue;
      if (cmd.includes("--grep")) {
        items.push({ kind: "script", label: name, arg: name });
      }
    }
    return items;
  }, [featureModules, testScripts]);

  const filtered = React.useMemo((): PaletteItem[] => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (it) => it.label.toLowerCase().includes(q) || it.arg.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  const items = React.useMemo((): PaletteItem[] => {
    const q = query.trim();
    if (!q) return filtered;
    const isFilter = q.startsWith("@") || q.startsWith("--");
    if (!isFilter) return filtered;
    const exactMatch = filtered.some((it) => it.arg === q);
    if (exactMatch) return filtered;
    return [...filtered, { kind: "custom", label: `Run "${q}"`, arg: q }];
  }, [filtered, query]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (items[activeIdx]) onRun(items[activeIdx].arg); }
    else if (e.key === "Escape") { onClose(); }
  }, [items, activeIdx, onRun, onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] pointer-events-none">
        <div className="pointer-events-auto w-[480px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-700">
            <span className="text-slate-500 text-sm">⌕</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search modules, workflows, scripts…"
              className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-600 outline-none"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-slate-600 hover:text-slate-400 text-xs">✕</button>
            )}
            <kbd className="text-slate-700 text-[10px] font-mono border border-slate-700 rounded px-1 py-0.5">esc</kbd>
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto scrollable py-1">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-slate-600 text-xs text-center">No matches — type a tag like @auth or a script name</p>
            ) : (
              items.map((item, idx) => {
                const meta = kindMeta[item.kind];
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={`${item.kind}-${item.arg}`}
                    data-idx={idx}
                    onClick={() => onRun(item.arg)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${meta.rowHover} ${isActive ? "bg-slate-800" : ""}`}
                  >
                    <span className={`text-xs flex-shrink-0 ${item.kind === "module" ? "text-brand-400" : item.kind === "workflow" ? "text-emerald-400" : item.kind === "custom" ? "text-amber-400" : "text-slate-500"}`}>
                      {meta.icon}
                    </span>
                    <span className={`flex-1 text-xs font-medium truncate ${isActive ? "text-white" : "text-slate-300"}`}>
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${meta.badgeCls}`}>
                      {meta.badge}
                    </span>
                    {isActive && (
                      <kbd className="text-slate-600 text-[10px] font-mono">↵</kbd>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-3 text-slate-700 text-[10px]">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> run</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
            <span className="ml-auto">or type a custom filter: @tag · --grep · --project</span>
          </div>
        </div>
      </div>
    </>
  );
}
