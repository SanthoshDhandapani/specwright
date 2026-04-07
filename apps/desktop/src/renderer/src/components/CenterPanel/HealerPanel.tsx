import React, { useState, useCallback } from "react";
import { useConfigStore } from "@renderer/store/config.store";
import { usePipelineStore } from "@renderer/store/pipeline.store";

export default function HealerPanel(): React.JSX.Element {
  const { projectPath } = useConfigStore();
  const { status, startRun, setError } = usePipelineStore();
  const [paths, setPaths] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRunning = isSubmitting || status === "running";

  const handleBrowse = useCallback(async () => {
    const selected = await window.specwright.project.pickFiles();
    if (selected.length > 0) {
      setPaths((prev) => {
        const existing = new Set(prev);
        return [...prev, ...selected.filter((p) => !existing.has(p))];
      });
    }
  }, []);

  const removePath = useCallback((index: number) => {
    setPaths((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleHeal = useCallback(async () => {
    if (isRunning || !projectPath) return;
    setIsSubmitting(true);
    try {
      // Build the heal command
      const pathArgs = paths.length > 0 ? paths.join(" ") : "";
      let userMessage = `Run the /e2e-heal skill to diagnose and fix failing E2E tests.`;
      if (pathArgs) {
        userMessage += `\n\nTarget files/directories:\n${paths.map((p) => `- ${p}`).join("\n")}`;
      } else {
        userMessage += `\n\nHeal all failing tests in the project.`;
      }
      if (instructions.trim()) {
        userMessage += `\n\nAdditional instructions:\n${instructions.trim()}`;
      }

      startRun(userMessage);
      const { skipPermissions } = useConfigStore.getState();
      await window.specwright.pipeline.start({
        userMessage,
        mode: "claude-code",
        skipPermissions,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [isRunning, projectPath, paths, instructions, startRun, setError]);

  // Shorten path for display — show relative to project
  const displayPath = (fullPath: string): string => {
    if (projectPath && fullPath.startsWith(projectPath)) {
      return fullPath.slice(projectPath.length + 1);
    }
    return fullPath.split("/").slice(-3).join("/");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Content — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollable px-4 py-4 space-y-4">
        {/* Files to heal */}
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Files to Heal
          </label>
          <p className="text-slate-500 text-xs mb-3">
            Select test files or directories with failing tests. Leave empty to heal all failures.
          </p>

          {/* Path chips */}
          {paths.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {paths.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <span className="text-slate-500 text-xs">📁</span>
                  <span className="flex-1 text-slate-300 text-xs font-mono truncate" title={p}>
                    {displayPath(p)}
                  </span>
                  <button
                    onClick={() => removePath(i)}
                    className="text-slate-600 hover:text-red-400 text-xs transition-colors flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleBrowse}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm border border-dashed border-slate-600 hover:border-slate-500 disabled:opacity-40 rounded-lg px-3 py-2 w-full justify-center transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Add file or directory
          </button>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Instructions <span className="text-slate-600 font-normal">(optional)</span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={isRunning}
            placeholder="Describe what's failing or what to fix…&#10;e.g., &quot;The year tab selectors changed from buttons to links&quot;"
            rows={4}
            className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500 placeholder-slate-600 resize-none disabled:opacity-40"
          />
        </div>

        {/* Info */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3">
          <p className="text-slate-400 text-xs leading-relaxed">
            The healer agent will run the tests, diagnose failures (selector, timeout, assertion, data issues),
            and auto-fix step definitions. It loops up to 3 times until tests pass.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 border-t border-slate-700 px-4 py-3 flex items-center justify-end bg-slate-900">
        <button
          onClick={handleHeal}
          disabled={isRunning || !projectPath}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
        >
          {isRunning ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Healing…
            </>
          ) : (
            <>
              <span>💊</span>
              Heal
            </>
          )}
        </button>
      </div>
    </div>
  );
}
