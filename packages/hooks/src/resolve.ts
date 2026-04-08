/**
 * resolve.ts — Converts declarative hook declarations into Agent SDK HookCallbackMatcher[].
 *
 * This is the bridge between YAML/JSON declarations (skill frontmatter, RunnerOptions)
 * and the Agent SDK's programmatic hooks API.
 */

import { compileRules } from "./rules-compiler";
import type {
  SkillHookDeclarations,
  HookMatcherDeclaration,
  HookCallback,
  HookCallbackOutput,
  ResolvedHookMatcher,
  ResolveOptions,
} from "./types";

/**
 * Load a hook module by path.
 *
 * Module contract: exports a default factory function that accepts a config
 * object and returns a HookCallback.
 *
 * Supported module paths:
 * - "@specwright/hooks/validate-bash" → built-in module
 * - "./hooks/my-hook.js" → relative to cwd
 * - "some-npm-package/hook" → node_modules resolution
 */
async function loadHookModule(
  modulePath: string,
  config: Record<string, unknown>,
  cwd?: string
): Promise<HookCallback> {
  let resolvedPath = modulePath;

  // Resolve built-in modules: "@specwright/hooks/foo" → "./foo"
  if (modulePath.startsWith("@specwright/hooks/")) {
    const name = modulePath.replace("@specwright/hooks/", "");
    // Use relative import for built-in modules
    resolvedPath = `./${name}`;
  }

  // Resolve relative paths against cwd
  if (resolvedPath.startsWith("./") || resolvedPath.startsWith("../")) {
    if (cwd && !resolvedPath.startsWith("./")) {
      const path = await import("path");
      resolvedPath = path.resolve(cwd, resolvedPath);
    }
  }

  try {
    // Dynamic import for both ESM and CJS modules
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function("specifier", "return import(specifier)") as
      (specifier: string) => Promise<Record<string, unknown>>;

    // For built-in modules, import from the package itself
    let mod: Record<string, unknown>;
    if (modulePath.startsWith("@specwright/hooks/")) {
      const name = modulePath.replace("@specwright/hooks/", "");
      // Import the built-in module directly
      mod = await dynamicImport(`@specwright/hooks`);
      // The named export matches the camelCase version of the module name
      const camelName = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      const factory = mod[camelName] as ((cfg: Record<string, unknown>) => HookCallback) | undefined;
      if (typeof factory === "function") {
        return factory(config);
      }
      throw new Error(`Built-in hook "${name}" not found in @specwright/hooks (looked for export "${camelName}")`);
    }

    mod = await dynamicImport(resolvedPath);

    // Support: export default function(config) => HookCallback
    if (typeof mod.default === "function") {
      return mod.default(config) as HookCallback;
    }
    // Support: export function hook(config) => HookCallback
    if (typeof mod.hook === "function") {
      return (mod.hook as (cfg: Record<string, unknown>) => HookCallback)(config);
    }

    throw new Error(
      `Hook module "${modulePath}" must export default(config) or hook(config)`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load hook module "${modulePath}": ${message}`);
  }
}

/**
 * Compose multiple HookCallbacks into one.
 * Callbacks are executed in order. The first non-passthrough result wins.
 */
function composeCallbacks(callbacks: HookCallback[]): HookCallback {
  if (callbacks.length === 1) return callbacks[0];

  return async (input, toolUseId, opts): Promise<HookCallbackOutput> => {
    for (const cb of callbacks) {
      const result = await cb(input, toolUseId, opts);
      // If this callback made a decision (not just passthrough), return it
      if (!result.continue) {
        return result;
      }
    }
    return { continue: true };
  };
}

/**
 * Resolve a single HookMatcherDeclaration into a ResolvedHookMatcher.
 */
async function resolveMatcher(
  declaration: HookMatcherDeclaration,
  options?: ResolveOptions
): Promise<ResolvedHookMatcher> {
  const callbacks: HookCallback[] = [];

  // 1. Compile inline rules (if any)
  if (declaration.rules && declaration.rules.length > 0) {
    callbacks.push(compileRules(declaration.rules));
  }

  // 2. Load module callback (if any)
  if (declaration.module) {
    const moduleCallback = await loadHookModule(
      declaration.module,
      declaration.config ?? {},
      options?.cwd
    );
    callbacks.push(moduleCallback);
  }

  // 3. Add direct callbacks (if any — programmatic usage only)
  if (declaration.callbacks) {
    callbacks.push(...declaration.callbacks);
  }

  // Compose all callbacks into one
  const composedHooks = callbacks.length > 0 ? [composeCallbacks(callbacks)] : [];

  return {
    matcher: declaration.matcher,
    timeout: declaration.timeout,
    hooks: composedHooks,
  };
}

/**
 * Resolve skill hook declarations into Agent SDK HookCallbackMatcher[] format.
 *
 * @param declarations - Hook declarations from skill frontmatter or RunnerOptions
 * @param options - Resolution options (cwd for relative module paths)
 * @returns SDK-compatible hooks object, ready to pass to query({ options: { hooks } })
 *
 * @example
 * ```typescript
 * const hooks = await resolveSkillHooks({
 *   PreToolUse: [{
 *     matcher: 'Bash',
 *     rules: [{ deny: 'rm -rf /', reason: 'Dangerous' }],
 *   }],
 *   PostToolUse: [{
 *     matcher: 'Write',
 *     module: '@specwright/hooks/track-generated-files',
 *     config: { outputDir: 'e2e-tests/features' },
 *   }],
 * });
 *
 * // Pass to Agent SDK:
 * query({ prompt: '...', options: { hooks } });
 * ```
 */
export async function resolveSkillHooks(
  declarations: SkillHookDeclarations,
  options?: ResolveOptions
): Promise<Record<string, ResolvedHookMatcher[]>> {
  const resolved: Record<string, ResolvedHookMatcher[]> = {};

  for (const [event, matchers] of Object.entries(declarations)) {
    if (!matchers || matchers.length === 0) continue;

    const resolvedMatchers: ResolvedHookMatcher[] = [];
    for (const matcher of matchers) {
      resolvedMatchers.push(await resolveMatcher(matcher, options));
    }

    resolved[event] = resolvedMatchers;
  }

  return resolved;
}
