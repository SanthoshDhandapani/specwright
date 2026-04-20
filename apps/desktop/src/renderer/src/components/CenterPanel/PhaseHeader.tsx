import React from "react";
import type { Phase } from "@renderer/store/pipeline.store";

export function PhaseHeader({ phase, isActive }: { phase: Phase; isActive: boolean }): React.JSX.Element {
  const statusNode = (() => {
    if (phase.status === "done") {
      return <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">✓ Done</span>;
    }
    if (phase.status === "running") {
      return (
        <span className="text-brand-400 text-[11px] font-medium flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 border-[1.5px] border-brand-400 border-t-transparent rounded-full animate-spin" />
          Running
        </span>
      );
    }
    if (phase.status === "error") {
      return <span className="text-red-400 text-[11px] font-medium">✕ Error</span>;
    }
    return null;
  })();

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
      isActive ? "border-brand-700/60 bg-brand-950/30" : "border-slate-700/60 bg-slate-800/60"
    }`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          phase.status === "done"
            ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700/60"
            : phase.status === "running"
            ? "bg-brand-900/60 text-brand-300 border border-brand-600/60"
            : "bg-slate-700/60 text-slate-400 border border-slate-600/40"
        }`}>
          {phase.id}
        </span>
        <span className={`text-sm font-semibold font-mono ${
          phase.status === "running" ? "text-brand-300" : phase.status === "done" ? "text-slate-200" : "text-slate-400"
        }`}>
          {phase.label}
        </span>
      </div>
      {statusNode}
    </div>
  );
}
