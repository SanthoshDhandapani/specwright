import React, { useEffect, useRef, useState } from "react";
import { usePipelineStore } from "@renderer/store/pipeline.store";

export default function TerminalPanel(): React.JSX.Element {
  const { logLines, status, errorMessage } = usePipelineStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logLines.length, minimized]);

  // Auto-expand when pipeline starts running
  useEffect(() => {
    if (status === "running") setMinimized(false);
  }, [status]);

  return (
    <div className={`flex flex-col overflow-hidden transition-all duration-200 ${minimized ? "h-9" : "h-full"}`}>
      {/* Header — always visible, clickable to toggle */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-slate-800 flex-shrink-0 cursor-pointer hover:bg-slate-800/50 select-none"
        onClick={() => setMinimized(!minimized)}
      >
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          Terminal
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "running" ? "bg-green-400 animate-pulse" :
                status === "error"   ? "bg-red-400" :
                status === "done"    ? "bg-green-600" :
                "bg-slate-600"
              }`}
            />
            <span className="text-slate-600 text-xs capitalize">{status}</span>
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700"
            title={minimized ? "Expand terminal" : "Minimize terminal"}
          >
            {minimized ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Log lines — hidden when minimized */}
      {!minimized && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto scrollable px-3 py-2">
            {logLines.length === 0 && status === "idle" && (
              <p className="text-slate-700 text-xs terminal">Waiting for pipeline to start…</p>
            )}

            <div className="terminal text-slate-300 space-y-0.5">
              {logLines.map((line, i) => (
                <div key={i} className="leading-relaxed">
                  <span className="text-slate-600 mr-2 select-none flex-shrink-0">{String(i + 1).padStart(3, " ")}</span>
                  <span className={`select-text cursor-text ` +
                    (line.startsWith("[tool]")        ? "text-yellow-400" :
                    line.startsWith("[pipeline]")    ? "text-slate-300" :
                    line.startsWith("[mcp]")         ? "text-cyan-400" :
                    line.startsWith("[permission]")  ? "text-amber-400" :
                    line.startsWith("[user]")        ? "text-brand-400" :
                    line.startsWith("[claude")       ? "text-slate-500" :
                    (line.includes("error") || line.includes("Error") || line.includes("ERROR")) ? "text-red-400" :
                    line.includes("Done")            ? "text-green-400" :
                    "text-slate-300")
                  }>
                    {line}
                  </span>
                </div>
              ))}

              {status === "error" && errorMessage && (
                <div className="text-red-400 mt-1">✕ {errorMessage}</div>
              )}
            </div>

            <div ref={bottomRef} />
          </div>
        </>
      )}
    </div>
  );
}
