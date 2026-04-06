import React, { useEffect } from "react";
import { useConfigStore } from "@renderer/store/config.store";

export default function WelcomeScreen(): React.JSX.Element {
  const { projectState, bootstrapLog, pickAndBootstrap, appendBootstrapLog } = useConfigStore();

  const isBootstrapping = projectState === "bootstrapping";

  // Wire bootstrap log IPC events
  useEffect(() => {
    const off = window.specwright.project.onBootstrapLog(({ line }) => appendBootstrapLog(line));
    return off;
  }, [appendBootstrapLog]);
  const hasError = projectState === "error";

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      {/* Logo / Title */}
      <div className="text-center">
        <div className="text-5xl mb-4">⚡</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Specwright</h1>
        <p className="text-slate-400 mt-2 text-sm max-w-sm">
          Visual Playwright BDD test generator. Pick a folder to scaffold a new E2E test project.
        </p>
      </div>

      {/* Create button */}
      <button
        onClick={pickAndBootstrap}
        disabled={isBootstrapping}
        className="flex items-center gap-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-8 py-4 transition-all shadow-lg hover:shadow-brand-500/20 text-base"
      >
        {isBootstrapping ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Bootstrapping…
          </>
        ) : (
          <>
            <span className="text-xl">+</span>
            Create new test project
          </>
        )}
      </button>

      {/* Bootstrap log */}
      {(isBootstrapping || hasError) && bootstrapLog.length > 0 && (
        <div className="w-full max-w-lg bg-slate-900 rounded-lg border border-slate-700 p-4 font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
          {bootstrapLog.map((line, i) => (
            <div key={i} className={line.includes("Error") ? "text-red-400" : "text-slate-300"}>
              {line}
            </div>
          ))}
        </div>
      )}

      {hasError && (
        <p className="text-red-400 text-sm">
          Bootstrap failed. Check the log above and try again.
        </p>
      )}

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-xl">
        {[
          { icon: "🧪", label: "BDD Features", desc: "Gherkin .feature files with Playwright" },
          { icon: "🤖", label: "AI Generation", desc: "Claude Code CLI runs the pipeline" },
          { icon: "📁", label: "Zero Config", desc: "All settings live in your project folder" },
        ].map(({ icon, label, desc }) => (
          <div
            key={label}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center"
          >
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-slate-300 text-xs font-medium">{label}</p>
            <p className="text-slate-600 text-xs mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
