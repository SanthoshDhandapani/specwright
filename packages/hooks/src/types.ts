/**
 * types.ts — Hook declaration types for skill frontmatter and claude-runner.
 *
 * These types describe the YAML/JSON format that users write.
 * resolveSkillHooks() converts them into Agent SDK HookCallbackMatcher[] objects.
 */

// ─── Hook events supported by the Agent SDK ──────────────────────────────

/** Subset of Agent SDK hook events most useful for skills. */
export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "UserPromptSubmit"
  | "SessionStart"
  | "SessionEnd"
  | "Stop"
  | "SubagentStart"
  | "SubagentStop"
  | "PreCompact"
  | "PostCompact"
  | "TaskCreated"
  | "TaskCompleted"
  | "FileChanged";

// ─── Declarative hook rules ──────────────────────────────────────────────

/** A single inline rule — evaluated against tool input for PreToolUse hooks. */
export interface HookRule {
  /** Pattern to deny. If the tool input matches, the tool call is blocked. */
  deny?: string;
  /** Pattern to allow. If the tool input matches, the tool call is approved. */
  allow?: string;
  /** Context string to inject into the hook output (additionalContext). */
  context?: string;
  /** Human-readable reason for deny/allow decisions. */
  reason?: string;
}

// ─── Hook matcher declaration ────────────────────────────────────────────

/**
 * A single hook matcher — one entry in the hooks array for a given event.
 *
 * Supports three modes:
 * 1. Inline rules only (simple pattern matching)
 * 2. Module reference only (JS factory function)
 * 3. Both — rules evaluated first, module called if no terminal decision
 */
export interface HookMatcherDeclaration {
  /** Tool name or pattern to match (e.g., "Bash", "Write", "mcp__playwright-test__*"). */
  matcher?: string;
  /** Timeout in seconds for the hook callback. */
  timeout?: number;
  /** Inline declarative rules (evaluated in order). */
  rules?: HookRule[];
  /** Path to a JS module exporting a hook factory: default(config) => HookCallback. */
  module?: string;
  /** Config object passed to the module factory. */
  config?: Record<string, unknown>;
  /**
   * Direct SDK callback functions (advanced usage — only available programmatically,
   * not in YAML frontmatter).
   */
  callbacks?: Array<(
    input: Record<string, unknown>,
    toolUseId: string | undefined,
    options: { signal: AbortSignal }
  ) => Promise<HookCallbackOutput>>;
}

// ─── Skill hook declarations ─────────────────────────────────────────────

/**
 * Top-level hook declarations — maps event names to matcher arrays.
 * This is the format used in skill YAML frontmatter and claude-runner RunnerOptions.
 *
 * @example YAML frontmatter
 * ```yaml
 * hooks:
 *   PreToolUse:
 *     - matcher: Bash
 *       rules:
 *         - deny: "rm -rf /"
 *           reason: "Dangerous command"
 *   PostToolUse:
 *     - matcher: Write
 *       module: "@specwright/hooks/track-generated-files"
 *       config:
 *         outputDir: "e2e-tests/features"
 * ```
 */
export type SkillHookDeclarations = Partial<Record<string, HookMatcherDeclaration[]>>;

// ─── Hook callback output (simplified from Agent SDK) ────────────────────

/** Output returned by a hook callback — maps to Agent SDK's SyncHookJSONOutput. */
export interface HookCallbackOutput {
  /** Whether to continue processing (passthrough). */
  continue?: boolean;
  /** Block the operation. */
  decision?: "approve" | "block";
  /** Human-readable reason. */
  reason?: string;
  /** Suppress output from this hook. */
  suppressOutput?: boolean;
  /** Hook-specific output (additionalContext, permissionDecision, etc.). */
  hookSpecificOutput?: Record<string, unknown>;
}

/** A hook callback function — the runtime form after resolution. */
export type HookCallback = (
  input: Record<string, unknown>,
  toolUseId: string | undefined,
  options: { signal: AbortSignal }
) => Promise<HookCallbackOutput>;

// ─── Resolved SDK types ──────────────────────────────────────────────────

/** Matches Agent SDK's HookCallbackMatcher shape. */
export interface ResolvedHookMatcher {
  matcher?: string;
  timeout?: number;
  hooks: HookCallback[];
}

// ─── Options ─────────────────────────────────────────────────────────────

export interface ResolveOptions {
  /** Working directory for resolving relative module paths. */
  cwd?: string;
}
