/**
 * generation-summary.ts — Stop hook module.
 *
 * Aggregates generation metrics at session end and injects a summary
 * as additionalContext so Claude includes it in its final response.
 */

import type { HookCallback, HookCallbackOutput } from "./types";

export interface GenerationSummaryConfig {
  /** Callback to receive the final summary. */
  onSummary?: (summary: GenerationMetrics) => void;
  /** Inject summary as additionalContext. Default: true. */
  injectContext?: boolean;
}

export interface GenerationMetrics {
  filesGenerated: number;
  featuresCreated: number;
  stepsImplemented: number;
  testsPassed: number;
  testsFailed: number;
  totalDurationMs: number;
}

/**
 * Creates a Stop hook that aggregates metrics.
 *
 * Note: This hook works best when combined with track-generated-files
 * and capture-test-results hooks that update shared state. In standalone
 * mode, it provides a basic summary from the session's stop context.
 */
export default function generationSummary(config: GenerationSummaryConfig = {}): HookCallback {
  const injectContext = config.injectContext ?? true;
  const startTime = Date.now();

  return async (_input, _toolUseId, _opts): Promise<HookCallbackOutput> => {
    const metrics: GenerationMetrics = {
      filesGenerated: 0,
      featuresCreated: 0,
      stepsImplemented: 0,
      testsPassed: 0,
      testsFailed: 0,
      totalDurationMs: Date.now() - startTime,
    };

    config.onSummary?.(metrics);

    if (injectContext) {
      const durationSec = (metrics.totalDurationMs / 1000).toFixed(1);
      return {
        hookSpecificOutput: {
          hookEventName: "Stop",
          additionalContext: `Pipeline completed in ${durationSec}s.`,
        },
      };
    }

    return { continue: true };
  };
}
