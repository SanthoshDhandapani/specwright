/**
 * @specwright/hooks — Declarative hook system for Specwright skills and claude-runner.
 *
 * Converts YAML hook declarations (from skill frontmatter or RunnerOptions)
 * into Agent SDK HookCallbackMatcher[] objects at runtime.
 */

export { resolveSkillHooks } from "./resolve";
export { compileRules } from "./rules-compiler";

// Types
export type {
  SkillHookDeclarations,
  HookMatcherDeclaration,
  HookRule,
  ResolveOptions,
} from "./types";

// Built-in hook modules
export { default as validateBash } from "./validate-bash";
export { default as captureTestResults } from "./capture-test-results";
export { default as trackGeneratedFiles } from "./track-generated-files";
export { default as phaseTracker } from "./phase-tracker";
export { default as generationSummary } from "./generation-summary";
