/**
 * validate-bash.ts — PreToolUse hook module.
 *
 * Validates Bash commands against deny/allow patterns and blocks destructive commands.
 */

import type { HookCallback, HookCallbackOutput } from "./types";

export interface ValidateBashConfig {
  /** Patterns to always deny (substring, glob, or /regex/). */
  deny?: string[];
  /** Patterns to always allow. */
  allow?: string[];
  /** Block known destructive commands by default. Default: true. */
  blockDestructive?: boolean;
}

const DESTRUCTIVE_PATTERNS = [
  /^rm\s+-rf\s+\/\s*$/,           // rm -rf /
  /^rm\s+-rf\s+\.\s*$/,           // rm -rf .
  /^rm\s+-rf\s+~\s*$/,            // rm -rf ~
  />\s*\/dev\/sd[a-z]/,            // write to disk device
  /mkfs\./,                         // format filesystem
  /dd\s+if=.*of=\/dev\//,          // dd to device
  /:(){ :\|:& };:/,                // fork bomb
];

function matchesPattern(command: string, pattern: string): boolean {
  if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
    const lastSlash = pattern.lastIndexOf("/");
    try {
      return new RegExp(pattern.slice(1, lastSlash), pattern.slice(lastSlash + 1)).test(command);
    } catch { /* fall through */ }
  }
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(escaped).test(command);
  }
  return command.includes(pattern);
}

export default function validateBash(config: ValidateBashConfig = {}): HookCallback {
  const denyPatterns = config.deny ?? [];
  const allowPatterns = config.allow ?? [];
  const blockDestructive = config.blockDestructive ?? true;

  return async (input, _toolUseId, _opts): Promise<HookCallbackOutput> => {
    const toolInput = input.tool_input as Record<string, unknown> | undefined;
    const command = String(toolInput?.command ?? "");
    if (!command) return { continue: true };

    // Check explicit allow patterns first
    for (const pattern of allowPatterns) {
      if (matchesPattern(command, pattern)) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "allow",
            permissionDecisionReason: `Allowed by pattern: ${pattern}`,
          },
        };
      }
    }

    // Check explicit deny patterns
    for (const pattern of denyPatterns) {
      if (matchesPattern(command, pattern)) {
        return {
          decision: "block",
          reason: `Command matches deny pattern: ${pattern}`,
        };
      }
    }

    // Block destructive commands
    if (blockDestructive) {
      for (const re of DESTRUCTIVE_PATTERNS) {
        if (re.test(command)) {
          return {
            decision: "block",
            reason: `Destructive command blocked: ${command.slice(0, 80)}`,
          };
        }
      }
    }

    return { continue: true };
  };
}
