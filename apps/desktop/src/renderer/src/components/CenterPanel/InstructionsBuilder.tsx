import React, { useEffect, useState } from "react";
import { useConfigStore } from "@renderer/store/config.store";
import { useInstructionStore } from "@renderer/store/instruction.store";
import { usePipelineStore } from "@renderer/store/pipeline.store";
import InstructionCard from "./InstructionCard";

export default function InstructionsBuilder(): React.JSX.Element {
  const { projectPath, envVars } = useConfigStore();
  const { cards, addCard, serialize, loadCards } = useInstructionStore();
  const { status, startRun, setError } = usePipelineStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // isRunning is true while submitting OR while the pipeline store says running
  const isRunning = isSubmitting || status === "running";

  // Load existing instructions from disk on mount
  useEffect(() => {
    if (!projectPath) return;
    window.specwright.project.readInstructions(projectPath).then((loaded) => {
      if (loaded.length > 0) loadCards(loaded);
    });
  }, [projectPath, loadCards]);

  const [saveError, setSaveError] = useState<string | null>(null);

  /** Validate and normalize pageURLs before saving */
  const validateAndNormalizeInstructions = (
    instructions: Array<Record<string, unknown>>,
    baseUrl: string
  ): string | null => {
    for (let i = 0; i < instructions.length; i++) {
      const card = instructions[i];
      const pageURL = (card.pageURL as string) ?? "";

      if (!pageURL) continue; // empty is OK — exploration won't run

      // Relative path → prepend BASE_URL
      if (pageURL.startsWith("/")) {
        if (!baseUrl) {
          return `Instruction ${i + 1}: Page URL "${pageURL}" is a relative path but no App URL is configured in Settings.`;
        }
        card.pageURL = `${baseUrl}${pageURL}`;
        continue;
      }

      // Full URL → validate format
      try {
        const parsed = new URL(pageURL);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return `Instruction ${i + 1}: Page URL "${pageURL}" must use http:// or https:// protocol.`;
        }
      } catch {
        return `Instruction ${i + 1}: Page URL "${pageURL}" is not a valid URL. Use a full URL (http://...) or a relative path (/path).`;
      }
    }
    return null; // no errors
  };

  const handleSave = async (): Promise<void> => {
    if (!projectPath) return;
    setSaveError(null);

    const instructions = serialize();
    const baseUrl = (envVars.BASE_URL || "").replace(/\/$/, "");

    const error = validateAndNormalizeInstructions(
      instructions as Array<Record<string, unknown>>,
      baseUrl
    );
    if (error) {
      setSaveError(error);
      return;
    }

    await window.specwright.project.writeInstructions(projectPath, instructions);
  };

  const handleGenerate = async (): Promise<void> => {
    if (isRunning) return;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      await handleSave();
      // If validation failed, handleSave sets saveError and returns early — don't proceed
      if (saveError) { setIsSubmitting(false); return; }
      const userMessage = `Run the /e2e-automate skill to execute the full E2E test automation pipeline. The instructions.js file has been saved and is ready. Read it from e2e-tests/instructions.js and execute all phases.`;
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
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Instruction cards — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollable px-4 py-3 space-y-3">
        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-slate-600 text-sm mb-3">No instructions yet.</p>
            <p className="text-slate-700 text-xs max-w-xs">
              Click "+ Add Instruction" to define what pages and workflows to test, or insert a
              template from the right panel.
            </p>
          </div>
        )}
        {cards.map((card, i) => (
          <InstructionCard key={card.id} card={card} index={i} />
        ))}
      </div>

      {/* Validation error banner */}
      {saveError && (
        <div className="flex-shrink-0 px-4 py-2 bg-red-950/50 border-t border-red-800/50">
          <div className="flex items-center justify-between gap-2">
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <span>⚠</span> {saveError}
            </p>
            <button
              onClick={() => setSaveError(null)}
              className="text-red-600 hover:text-red-400 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex-shrink-0 border-t border-slate-700 px-4 py-3 flex items-center justify-between gap-3 bg-slate-900">
        <button
          onClick={addCard}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm border border-slate-600 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Add Instruction
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isRunning || !projectPath}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm border border-slate-600 hover:border-slate-500 disabled:opacity-40 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span className="text-base">💾</span>
            Save
          </button>
          <button
            onClick={handleGenerate}
            disabled={isRunning || !projectPath || cards.length === 0}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running…
              </>
            ) : (
              <>
                <span>▶</span>
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
