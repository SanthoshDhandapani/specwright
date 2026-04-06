import React from "react";
import { usePipelineStore, type Phase, type PhaseStatus } from "@renderer/store/pipeline.store";

function statusIcon(status: PhaseStatus): string {
  switch (status) {
    case "done":    return "✓";
    case "running": return "●";
    case "error":   return "✕";
    case "skipped": return "–";
    default:        return "○";
  }
}

function statusColors(status: PhaseStatus): string {
  switch (status) {
    case "done":    return "text-green-400 border-green-500 bg-green-500/10";
    case "running": return "text-brand-400 border-brand-500 bg-brand-500/10 animate-pulse";
    case "error":   return "text-red-400 border-red-500 bg-red-500/10";
    case "skipped": return "text-slate-500 border-slate-600 bg-transparent";
    default:        return "text-slate-600 border-slate-700 bg-transparent";
  }
}

function PhaseStep({ phase }: { phase: Phase }): React.JSX.Element {
  const colors = statusColors(phase.status);
  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* Step circle */}
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${colors}`}
      >
        {statusIcon(phase.status)}
      </div>
      {/* Label */}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium truncate ${
          phase.status === "running" ? "text-slate-100" :
          phase.status === "done"    ? "text-slate-300" :
          "text-slate-500"
        }`}>
          {phase.id}. {phase.label}
        </span>
        {phase.agentName && (
          <span className="text-slate-600 text-xs ml-1 hidden xl:inline">
            {phase.agentName}
          </span>
        )}
      </div>
      {/* Duration */}
      {phase.durationMs != null && (
        <span className="text-slate-600 text-xs flex-shrink-0">
          {(phase.durationMs / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

export default function PipelineStepper(): React.JSX.Element {
  const { phases, status } = usePipelineStore();

  return (
    <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pipeline</span>
        {status === "running" && (
          <span className="text-brand-400 text-xs animate-pulse">Running…</span>
        )}
        {status === "done" && (
          <span className="text-green-400 text-xs">Done</span>
        )}
        {status === "error" && (
          <span className="text-red-400 text-xs">Error</span>
        )}
      </div>

      {/* Two-column grid of steps */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {phases.map((phase) => (
          <PhaseStep key={phase.id} phase={phase} />
        ))}
      </div>
    </div>
  );
}
