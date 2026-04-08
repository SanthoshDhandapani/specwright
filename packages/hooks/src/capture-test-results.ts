/**
 * capture-test-results.ts — PostToolUse hook module.
 *
 * Parses Playwright/bddgen test output from Bash tool responses
 * and optionally injects a summary as additionalContext.
 */

import type { HookCallback, HookCallbackOutput } from "./types";

export interface CaptureTestResultsConfig {
  /** Inject parsed results as additionalContext so Claude sees them. Default: false. */
  injectContext?: boolean;
  /** Callback to receive parsed test results. */
  onResults?: (results: TestResults) => void;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: string;
  command: string;
}

function parsePlaywrightOutput(output: string, command: string): TestResults | null {
  // Match Playwright's summary line: "X passed, Y failed, Z skipped"
  const passMatch = output.match(/(\d+)\s+passed/);
  const failMatch = output.match(/(\d+)\s+failed/);
  const skipMatch = output.match(/(\d+)\s+skipped/);
  const durationMatch = output.match(/\((\d+(?:\.\d+)?[ms]+)\)/);

  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0;

  if (passed === 0 && failed === 0 && skipped === 0) return null;

  return {
    passed,
    failed,
    skipped,
    total: passed + failed + skipped,
    duration: durationMatch?.[1],
    command,
  };
}

export default function captureTestResults(config: CaptureTestResultsConfig = {}): HookCallback {
  return async (input, _toolUseId, _opts): Promise<HookCallbackOutput> => {
    const toolInput = input.tool_input as Record<string, unknown> | undefined;
    const command = String(toolInput?.command ?? "");

    // Only process Playwright test commands
    if (
      !command.includes("playwright test") &&
      !command.includes("bddgen") &&
      !command.includes("npx playwright")
    ) {
      return { continue: true };
    }

    const output = String(input.tool_response ?? "");
    const results = parsePlaywrightOutput(output, command);

    if (!results) return { continue: true };

    // Notify via callback if provided
    config.onResults?.(results);

    // Inject as context if enabled
    if (config.injectContext) {
      const parts = [
        `Test results: ${results.total} total`,
        `${results.passed} passed`,
        results.failed > 0 ? `${results.failed} failed` : null,
        results.skipped > 0 ? `${results.skipped} skipped` : null,
        results.duration ? `in ${results.duration}` : null,
      ].filter(Boolean);

      return {
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: parts.join(", "),
        },
      };
    }

    return { continue: true };
  };
}
