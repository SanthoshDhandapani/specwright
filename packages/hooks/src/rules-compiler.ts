/**
 * rules-compiler.ts — Compiles inline declarative rules into a HookCallback.
 *
 * Rules are evaluated in order. The first matching rule wins:
 * - `deny` → block the tool call
 * - `allow` → approve the tool call
 * - `context` → inject additionalContext
 *
 * If no rule matches, returns { continue: true } (passthrough).
 */

import type { HookRule, HookCallback, HookCallbackOutput } from "./types";

/**
 * Test whether a command string matches a rule pattern.
 * Supports:
 * - Substring match: "rm -rf /" matches if command contains it
 * - Glob-style wildcard: "npx bddgen*" matches "npx bddgen --tags @smoke"
 * - Regex: "/pattern/" syntax for advanced matching
 */
function matchesPattern(value: string, pattern: string): boolean {
  // Regex pattern: /pattern/flags
  if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
    const lastSlash = pattern.lastIndexOf("/");
    const regex = pattern.slice(1, lastSlash);
    const flags = pattern.slice(lastSlash + 1);
    try {
      return new RegExp(regex, flags).test(value);
    } catch {
      // Invalid regex — fall through to substring match
    }
  }

  // Glob-style wildcard: convert * to .* for regex matching
  if (pattern.includes("*")) {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(escaped).test(value);
  }

  // Substring match
  return value.includes(pattern);
}

/**
 * Extract the matchable string from hook input based on the hook event type.
 * For PreToolUse: extracts the command from Bash, file_path from Write/Edit/Read, etc.
 * For other events: returns JSON stringified input.
 */
function extractMatchValue(input: Record<string, unknown>): string {
  // PreToolUse / PostToolUse — tool_input contains the tool's arguments
  const toolInput = input.tool_input as Record<string, unknown> | undefined;
  if (toolInput) {
    // Bash command
    if (typeof toolInput.command === "string") return toolInput.command;
    // File operations
    if (typeof toolInput.file_path === "string") return toolInput.file_path;
    // Pattern searches
    if (typeof toolInput.pattern === "string") return toolInput.pattern;
    // Generic — stringify
    return JSON.stringify(toolInput);
  }

  // UserPromptSubmit — prompt text
  if (typeof input.prompt === "string") return input.prompt;

  // Fallback
  return JSON.stringify(input);
}

/**
 * Compile an array of inline rules into a single HookCallback.
 */
export function compileRules(rules: HookRule[]): HookCallback {
  return async (input, _toolUseId, _opts): Promise<HookCallbackOutput> => {
    const value = extractMatchValue(input);

    for (const rule of rules) {
      if (rule.deny && matchesPattern(value, rule.deny)) {
        return {
          decision: "block",
          reason: rule.reason ?? `Blocked by hook rule: ${rule.deny}`,
        };
      }

      if (rule.allow && matchesPattern(value, rule.allow)) {
        return {
          hookSpecificOutput: {
            hookEventName: input.hook_event_name ?? "PreToolUse",
            permissionDecision: "allow",
            permissionDecisionReason: rule.reason,
          },
        };
      }

      if (rule.context) {
        return {
          hookSpecificOutput: {
            hookEventName: input.hook_event_name ?? "PreToolUse",
            additionalContext: rule.context,
          },
        };
      }
    }

    // No rule matched — passthrough
    return { continue: true };
  };
}
