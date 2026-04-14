# Changelog — @specwright/plugin

All notable changes to this package are documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [0.3.6] — 2026-04-14

### Skill: `e2e-automate/SKILL.md`

- **`autoApprove` flag for Phase 6** — If every config entry in `instructions.js` has `autoApprove: true` set, Phase 6 skips the blocking human approval prompt and proceeds directly to BDD generation. Enables fully automated pipeline runs (CI, testing) without any manual intervention. Normal runs without the flag are unchanged.
- **Phase 6 label clarified** — Heading changed from `User Approval (MANDATORY)` to `User Approval`, with the mandatory/blocking label now on the conditional branch: `⛔ User Approval (MANDATORY) BLOCKING` — making the `autoApprove` bypass clearly distinct from the mandatory gate.

### Config: `mcp.json.template`

- **Consolidated to single `@specwright/mcp` entry** — The template previously listed four separate MCP servers (`e2e-automation`, `playwright-test`, `atlassian`, `markitdown`). Now a single `specwright` entry replaces all four. Playwright, markitdown, and Atlassian MCP are bundled inside `@specwright/mcp` as internal proxies — users no longer configure them independently. `ANTHROPIC_API_KEY`, `SPECWRIGHT_PROJECT`, and `ATLASSIAN_TOKEN` are passed via env.

---

## [0.3.5] — 2026-04-13

### Skill: `e2e-run/SKILL.md`

- **Report paths instead of live server URLs** — The skill no longer runs `pnpm report:playwright` or `pnpm report:bdd:open` after tests complete. Both commands start blocking HTTP servers that hang or die when the pipeline process ends, producing dead `http://localhost:9323` links. The skill now outputs file paths only (`reports/playwright/index.html`, `reports/cucumber-bdd/html-report/index.html`) with a `→ To view: <command>` hint for manual use. The final summary line is updated to match.

---

## [0.3.4] — 2026-04-12

### Fixed
- **`playwright-test-planner` — removed `browser_take_screenshot` from allowed tools** — The planner agent was calling `browser_take_screenshot` with explicit filenames (e.g., `home-page.png`, `signin-step1.png`) during exploration, which saved files relative to CWD (project root) regardless of the `--output-dir .playwright-mcp` MCP flag. The `--output-dir` flag only controls auto-named screenshots; explicit paths bypass it. Removed `mcp__playwright-test__browser_take_screenshot` from the agent's `tools` frontmatter — the agent discovers all selectors via `browser_snapshot` (accessibility tree), so this has no impact on exploration quality.

---

## [0.3.3] — 2026-04-12

### Fixed
- **`@Authentication` module uses `safe_copy` in `install.sh`** — Previously `cp` (always overwrite) was used, which wiped any previously generated or overlay-customised `authentication.feature` and `steps.js` on every re-run of `npx @specwright/plugin init`. Changed to `safe_copy` so the generic template is only installed on a fresh setup; existing files (from `/e2e-automate` generation or an org overlay) are preserved.

---

## [0.3.2] — 2026-04-12

### Added
- **`e2e-tests/.knowledge/generate-context.md`** — Pre-built 2KB framework reference document containing FIELD_TYPES constants, processDataTable/validateExpectations API signatures, faker field patterns, and import depth table. The `/e2e-generate` skill reads this instead of the raw 17KB utility files, reducing agent context by ~45% on repeat runs. Falls back to reading utility files if the file is missing (new projects).

### Fixed
- **`package.json.snippet`** — Removed invalid `@playwright/mcp@^0.1.0` and `@specwright/mcp-server@^0.1.0` entries from devDependencies. Both packages do not exist at those versions on npm and caused `ERR_PNPM_NO_MATCHING_VERSION` on fresh installs.

### Changed
- **`install.sh`** — Now creates `e2e-tests/.knowledge/` directory and copies `generate-context.md` into target project during installation.

---

## [0.3.1] — 2026-04-12

### Fixed
- **`bddTestData not found` in workflow tests** — `run-workflow` Playwright project was using `fullyParallel: false` with `workers: 1`, which caused Playwright to reuse the same worker process across spec files. The `$bddFileData` fixture from one spec leaked into the next spec, producing a `bddTestData not found` error at runtime. Fixed by setting `fullyParallel: true` (fresh worker per test; `workers: 1` still keeps execution sequential via filesystem ordering).

### Agent: `bdd-generator.md`

- **Intermediate workflow phase support** — Added a third workflow phase type between `@0-Precondition` and terminal consumers: an *intermediate phase* that both loads predata from a predecessor AND saves new data for a successor. These must be tagged `@precondition @cross-feature-data @serial-execution` (NOT `@workflow-consumer`) so they complete before downstream phases start. The tag routing table in the agent is updated to reflect all three cases.

- **Workflow cross-phase shared step extraction (mandatory rule)** — Added an explicit 3-step protocol the agent must follow for every `@Workflows` entry with multiple sub-modules:
  1. Map all step patterns across every phase and identify any step appearing in 2+ phases
  2. Route shared steps to the correct shared file (`shared/{workflow-name}.steps.js` for intra-workflow reuse, `shared/workflow.steps.js` for cross-workflow reuse, existing shared file if the step fits an existing category)
  3. Write shared files first — then write each phase's `steps.js` without the extracted steps

  This prevents the most common workflow generation failure: a step defined inside `@Workflows/@Flow/@0-Phase/steps.js` is invisible to `@1-NextPhase` due to playwright-bdd v8+ path-based scoping. Previously the agent would co-locate all steps and only discover the scoping issue at test runtime.

- **Overwrite guard for shared step extraction** — When a `steps.js` being overwritten already contains a step being moved to `shared/`, the agent now omits it from the co-located file entirely rather than keeping it in both places (which causes a duplicate step definition error at runtime).

### Agent: `code-generator.md`

- **Workflow cross-phase implementation rule** — The agent now reads the `bdd-generator` output to know which steps belong in `shared/{workflow-name}.steps.js` vs phase-specific `steps.js`, and implements shared files first. Steps listed in shared files are never added to co-located `steps.js` files to avoid duplicate step definition errors.

### Skill: `e2e-automate/SKILL.md`

- **`explore: false` path** — When `explore` is `false` in the instruction config, the pipeline now skips browser exploration entirely. For localhost targets it greps `src/` for `data-testid` attributes and reads component files; for external URLs it uses the parsed plan as the only input. Previously the pipeline always attempted browser exploration regardless of this flag.

- **Agent memory update after exploration** — Phase 4 now explicitly instructs the planner to write all discovered selectors, navigation paths, and patterns into `.claude/agent-memory/playwright-test-planner/MEMORY.md` after each exploration session. Future runs on the same module benefit from cached selectors without re-exploring.

- **Module-specific run commands in Phase 10** — The final phase now derives and displays the exact `pnpm` command to run only the generated module's tests:
  - `@Workflows`: `pnpm test:bdd:workflows --grep "@{moduleName-lowercase}"`
  - `@Modules`: `pnpm test:bdd --grep "@{moduleName-lowercase}"`

---

## [0.3.0] — 2026-04-12

### Added
- **OTP env var support** — `TEST_OTP_SECRET` in `.env.testing` for two-factor auth flows.
- **Package manager detection** — `install.sh` now detects `pnpm`/`yarn`/`npm` and uses the right package manager.
- **BDD report tree view** — `pnpm report:bdd` generates a structured HTML report from Cucumber JSON output.
- **Workflow run scripts** — Added `pnpm test:bdd:workflows` and per-workflow convenience scripts to `package.json.snippet`.

### Changed
- **`install.sh`** — Rewritten for reliability: idempotent overlay of files, explicit error output, and PM detection.
- **`README-TESTING.md`** — Expanded with workflow test patterns, predata/cross-feature-data guide, and troubleshooting section.

---

## [0.2.0] — 2026-04-11

### Added
- **BDD HTML report generation** — `packages/plugin/e2e-tests/` now includes Cucumber reporter config. `pnpm test:bdd` outputs `reports/cucumber-bdd/report.json`; a post-process step generates the HTML report.
- **Auth strategy abstraction** — `auth.setup.js` now reads `AUTH_STRATEGY` from `.env.testing` and dispatches to `auth-strategies/email-password.js` or `auth-strategies/oauth.js`. No code changes needed when switching strategies.
- **`email-password` auth strategy** — New `auth-strategies/email-password.js` for apps using email + password login (two-step flow with `loginEmail` → `loginPassword`).
- **Precondition + workflow-consumer Playwright projects** — `playwright.config.ts` now includes dedicated `precondition`, `workflow-consumers`, and `run-workflow` projects for cross-feature data workflows. No manual config required.
- **`global-hooks.js` predata step** — `Given I load predata from "{string}"` with 30-second polling via `loadScopedTestData`.
- **`navigation.steps.js` TanStack Query DevTools cleanup** — Hides `.tsqd-parent-container` after `waitForLoadState` to prevent selector interference.

### Fixed
- **Auth injection in pipeline** — `auth.setup.js` correctly saves localStorage state to `auth-storage/.auth/user.json` for all auth strategies.
- **Browser exploration after navigation** — Playwright MCP `--output-dir` is now always set, preventing screenshot path conflicts.

---

## [0.1.5] — 2026-04-07

### Added
- **`cli.js` interactive wizard** — `npx @specwright/plugin init` now asks for auth strategy, base URL, and whether to include the auth module. Supports `--non-interactive` flag for Desktop app usage.
- **`mcp.json.template`** — Pre-configured MCP server config copied to project root on install. Includes `playwright-test` with correct `--output-dir .playwright-mcp` and `markitdown` entries.
- **`README.md`** — Comprehensive documentation with quick-start, architecture overview, MCP server docs, and privacy statement.
- **`.gitignore.snippet`** — Adds `.playwright-mcp/` and auth storage to project gitignore on install.

### Changed
- **`install.sh`** — Now copies agent files (`.claude_agents/` → `.claude/agents/`) and skill files (`.claude_skills/` → `.claude/skills/`) into the target project. Skills and agents are project-local — editable per-project without affecting the published package.
- **`stepHelpers.js`** — Added `FILL_AND_ENTER` FIELD_TYPE for tag/chip inputs that require pressing Enter after filling.
- **`auth.setup.js`** — Fixed `picture: ""` bug; `TEST_USER_PICTURE` now read directly from `.env.testing` instead of executing a Node.js subprocess.

### Fixed
- **`OAUTH_STORAGE_KEY` fallback removed** — Key is now required with no default. Tests fail loudly if missing rather than silently writing the wrong key to localStorage.

---

## [0.1.0] — 2026-04-06

Initial public release.

### Included
- Playwright BDD framework scaffold (`playwright.config.ts`, `fixtures.js`, `stepHelpers.js`, `testDataGenerator.js`)
- 8 Claude Code agents (test-planner, bdd-generator, code-generator, test-runner, test-healer, test-validator, test-processor, spec-reviewer)
- 7 skills (`/e2e-automate`, `/e2e-plan`, `/e2e-generate`, `/e2e-heal`, `/e2e-validate`, `/e2e-process`, `/e2e-run`)
- Shared step definitions (`auth.steps.js`, `navigation.steps.js`, `common.steps.js`, `global-hooks.js`)
- 3-layer test data persistence (`page.testData` → `featureDataCache` → `test-data/{scope}.json`)
- OAuth localStorage injection auth strategy
- Agent memory persistence (`.claude/agent-memory/`)
