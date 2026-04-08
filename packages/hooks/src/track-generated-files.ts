/**
 * track-generated-files.ts — PostToolUse hook module.
 *
 * Tracks files written by the Write tool during generation.
 * Accumulates a list that can be retrieved via callback or injected as context.
 */

import type { HookCallback, HookCallbackOutput } from "./types";

export interface TrackGeneratedFilesConfig {
  /** Only track files written under this directory. */
  outputDir?: string;
  /** File extensions to track (e.g., [".feature", ".js"]). Tracks all if empty. */
  extensions?: string[];
  /** Callback called each time a file is tracked. */
  onFile?: (filePath: string) => void;
  /** Inject tracked file count as additionalContext. Default: false. */
  injectContext?: boolean;
}

export default function trackGeneratedFiles(config: TrackGeneratedFilesConfig = {}): HookCallback {
  const trackedFiles: string[] = [];

  return async (input, _toolUseId, _opts): Promise<HookCallbackOutput> => {
    const toolInput = input.tool_input as Record<string, unknown> | undefined;
    const filePath = String(toolInput?.file_path ?? "");

    if (!filePath) return { continue: true };

    // Filter by output directory
    if (config.outputDir && !filePath.includes(config.outputDir)) {
      return { continue: true };
    }

    // Filter by extension
    if (config.extensions && config.extensions.length > 0) {
      const hasExt = config.extensions.some((ext) => filePath.endsWith(ext));
      if (!hasExt) return { continue: true };
    }

    trackedFiles.push(filePath);
    config.onFile?.(filePath);

    if (config.injectContext) {
      return {
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `Generated files so far: ${trackedFiles.length} (latest: ${filePath.split("/").pop()})`,
        },
      };
    }

    return { continue: true };
  };
}
