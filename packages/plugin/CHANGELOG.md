# Changelog — @specwright/plugin

All notable changes to this package are documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [0.4.4] — 2026-04-27

### Added

- **`cli.js` — writes `.specwright.json` on `init` and `update`.** After a successful install, the CLI now creates `.specwright.json` with `{ "plugin": "@specwright/plugin" }` if the file does not exist. This is required by the MCP server's `set_project` tool and by Specwright Desktop's `detectPlugin()`. Previously the file was only written by the Desktop app, so CLI-only installs had no `.specwright.json` and could not be opened in the Desktop app without manual setup.

### Fixed

- **`cli.js` — OAuth strategy now skips the auth module.** `npx @specwright/plugin init --auth-strategy=oauth` now passes `--skip-auth` to `install.sh`, matching the `none` strategy behaviour. OAuth apps authenticate via a provider redirect — there is no login form to generate tests for. Previously the CLI would prompt to install the auth module (or include it by default in `--non-interactive` mode) even for OAuth projects, producing a stub authentication feature that could not be executed.

- **`install.sh` — shared steps use `safe_copy` instead of `cp`.** The loop that copies `e2e-tests/features/playwright-bdd/shared/*.js` now calls `safe_copy` (only creates if missing) instead of `cp` (always overwrites). This preserves any customised shared step files (e.g. project-specific `navigation.steps.js` additions) when re-running `install.sh` or upgrading the plugin.

- **`e2e-desktop-automate/SKILL.md` — Phase 10 quality score format.** Aligned the desktop skill's Phase 10 with the main `e2e-automate` quality scoring format: deduction-based score starting at 100, star ratings, status labels (`PRODUCTION READY`, `READY — manual review recommended`, etc.), and structured markdown output sections (Generation Summary, Generated Files, Test Execution, Healing, Skipped Phases, Next Steps). The previous format was a plain code-block summary with no score.

---

## [0.4.3] — 2026-04-27

### Fixed

- **`generate-bdd-report.js` — BDD HTML report showing all scenarios as "Skipped"** — Fixed a multi-project reporter race condition where the `serial-execution` Playwright project grep-filters non-`@serial-execution` tests and writes `skipped` results to `reports/cucumber-bdd/report.json` after the `main-e2e` project already wrote `passed` results. The script now cross-references `reports/json/results.json` (the authoritative Playwright reporter) and promotes any scenario Playwright recorded as `expected` (passed) whose steps are all `skipped` with `duration: 0` — the exact signature of grep-filtered ghost results. Individual step promotion is used (not whole-scenario promotion) so mixed-status scenarios (e.g. precondition phases where a serial-execution project ran some real steps) are also handled correctly. Applied to both the base plugin and the ShowBuff example.

---

## [0.4.2] — 2026-04-26

### Added

- **`specwright.plugin.json` — base plugin manifest.** Adds the required manifest file (`name`, `version`, `type: "base"`) so Specwright Desktop can detect and display the base plugin in its local plugin picker. Previously the Desktop had no way to identify a locally cloned `packages/plugin/` directory as a valid plugin.

### Fixed

- **`e2e-automate/SKILL.md` — deduction-based quality scoring.** Replaced the ratio-weighted formula (`inputProcessingScore × 0.40 + selectorDiscoveryScore × 0.60`) with a deduction-only system starting at 100. The old formula always produced ~94 because `selectorDiscoveryScore` was unobservable and estimated at ~90% by the model. The new system only subtracts for actual observed failures (config errors, missing generated files, failing tests, unexpected phase aborts). A clean run with no failures always scores 100.

- **`e2e-automate/SKILL.md` — corrected status labels.** Removed "READY WITH MINOR FIXES" (misleading — implied action items when none existed). New labels: `100 → PRODUCTION READY`, `90–99 → PRODUCTION READY — issues auto-resolved`, `75–89 → READY — manual review recommended`, `60–74 → REQUIRES ATTENTION`, `<60 → SIGNIFICANT ISSUES`. Deduction table is only shown when score < 90.

- **`e2e-automate/SKILL.md` — Phase 8 per-config loop.** Phase 8 now iterates over each config entry individually, invoking `/e2e-heal @{moduleName}` with the module tag so `execution-manager` can infer the correct Playwright projects. Previously a single `/e2e-heal` call with no module context caused project inference to fall back to `chromium` (wrong for BDD mode).

---

## [0.4.1] — 2026-04-21

### Fixed

- **`install.sh` — bootstrap crash when running from npx cache.** The script was doing `cp "$PLUGIN_DIR/.specwright/.gitkeep" "$TARGET_DIR/.specwright/.gitkeep"` but `.specwright/` was not included in the published npm package, so the `cp` always failed with "No such file or directory" when installed via `npx`. Fixed by replacing the `cp` with `touch "$TARGET_DIR/.specwright/.gitkeep"` — the `.gitkeep` is an empty file, so creating it directly is equivalent and requires no source file from the package.

- **`package.json` — added `.specwright/` to `files`.** The `.specwright/` directory was missing from the npm `files` manifest, meaning it was never shipped in the published package. Added to prevent any future references to files inside it from failing.

### Changed

- **Desktop `ProjectService.ts` — non-interactive `pnpm install`.** The dependency install step (`pnpm install --ignore-scripts`) now passes `--yes` so pnpm auto-accepts the "remove and reinstall node_modules" prompt that appears when the lockfile changes after the plugin merges new devDependencies into `package.json`. Without this flag the bootstrap would stall waiting for user input that the Desktop app cannot provide.

---

## [0.4.0] — 2026-04-20

### Changed

- **`.specwright/` directory now ships as part of the plugin install.** Added `.specwright/.gitkeep` to the plugin source tree and updated `install.sh` to copy it into every fresh project install. The directory always pre-exists after `npx @specwright/plugin init`, so Phase 1 of the pipeline no longer needs to create it at runtime.

- **`e2e-automate/SKILL.md` — removed redundant `mkdir -p .specwright` from Phase 1.** The Phase 1 bash command previously ran `mkdir -p .specwright && date +%s > ...` on every pipeline run. Since the directory is now guaranteed to exist after install, the `mkdir -p` guard is no longer needed. The command is now simply `date +%s > .specwright/pipeline_start && cat .specwright/pipeline_start`.

- **`.gitignore.snippet` — refined `.specwright/` ignore rule.** Changed from `.specwright/` (ignores everything including `.gitkeep`) to `.specwright/*` + `!.specwright/.gitkeep`, so the sentinel file is tracked by git while runtime files (`pipeline_start`) remain ignored.

---

## [0.3.9] — 2026-04-20

### Fixed

- **`bdd-generator.md` — form consolidation rule.** Added mandatory rule: ALL form fields that belong to the same form MUST be consolidated into a single 3-column data table step (`When I fill the form with:`), regardless of whether values are static or generated. Previous behaviour allowed agents to split static fields (Priority, Category) into separate individual steps — bypassing `processDataTable` entirely and producing non-standard step definitions. The rule now covers all interaction types (`FILL`, `DROPDOWN`, `CLICK`, `CHECKBOX_TOGGLE`, or any overlay-provided FIELD_TYPE). Added correct-vs-wrong Gherkin examples to reinforce the pattern.

- **`code-generator.md` — base plugin FIELD_TYPES scoping.** Removed MUI-specific types (`MUI_SELECT`, `MUI_AUTOCOMPLETE`) from the base plugin's `processDataTable` guidance. The base plugin only documents generic FIELD_TYPES (`FILL`, `FILL_AND_ENTER`, `DROPDOWN`, `CLICK`, `CHECKBOX_TOGGLE`, `TOGGLE`). Overlay plugins (e.g. `@specwright/plugin-mui`) provide additional types via their own `code-generator.md` override — base plugin agents must not reference overlay-specific constants.

---

## [0.3.8] — 2026-04-20

### Fixed

- **`install.sh` — `e2e-tests/templates/` not copied on install.** The `templates/` directory (`templates/memory/`, `templates/seed/`) was present in the published package but never included in the install script's copy step. Projects installed from 0.3.7 or earlier were missing it. Added `cp -r "$PLUGIN_DIR/e2e-tests/templates" "$TARGET_DIR/e2e-tests/"` after the other directory setup.
- **`.gitignore.snippet` — `.specwright/` added.** The `.specwright/` directory is now used by the pipeline to store runtime data (pipeline start timestamp for accurate duration calculation). Added to the gitignore snippet so it is not committed.

### Changed

- **`e2e-automate/SKILL.md` — accurate wall-clock duration.** Phase 1 now writes the start epoch to `.specwright/pipeline_start` via a Bash command. Phase 10 reads it and computes the diff in a single shell expression. Replaces the previous approach of asking the agent to "note" the value in context — which was unreliable under context compression and produced inaccurate durations.

---

## [0.3.7] — 2026-04-20

### Fixed

#### Config: `playwright.config.ts` — `precondition` project

- **Removed `workers: 1` from the `precondition` project.** `fullyParallel: false` alone is sufficient to guarantee sequential execution of scenarios within each Phase 0 spec file. `workers: 1` was not needed for within-file ordering and is actively harmful in projects with multiple workflows: it forces all Phase 0 spec files into one OS process, causing playwright-bdd's `$bddContext` worker fixture to leak its `>=` line cursor across files — the lookup for the second workflow's test (e.g. `pwTestLine: 11`) fails when the cursor has already advanced past it (e.g. `19`) from the first workflow's spec → `bddTestData not found`.

  **Root cause detail:** `$bddContext` is a worker-scoped fixture whose `>=` line cursor does not reset between spec files within the same worker. With `workers: 1` and two Phase 0 files (FavoritesWorkflow at lines 11, 19 and ListWorkflow at line 11), the cursor sits at 19 after the first file; `11 >= 19` is false → error. Single-workflow projects appear to work by coincidental line-number alignment and would break as soon as a second workflow is added.

  **Correct invariant:** use only `fullyParallel: false` on `precondition`. Each workflow's Phase 0 spec runs in its own fresh worker; inter-workflow ordering is enforced by `workflow-consumers.dependencies: ['precondition']`.

#### Skill: `e2e-run/SKILL.md`

- **Corrected Case 3 workflow tag usage example** — Changed `# Tag shorthand — workflow tag → run-workflow project` to `# Tag shorthand — workflow tag → precondition + workflow-consumers`. The `run-workflow` project must never be used for regular workflow test runs.
- **Updated "Why projects matter" explanation** — Removed stale `workers: 1` reference from the `precondition` project description. Now correctly states: "`precondition` runs `@precondition @cross-feature-data` tests with `fullyParallel: false` — each workflow's Phase 0 spec gets its own fresh worker."

#### Skills: `e2e-automate/SKILL.md`, `e2e-generate/SKILL.md`, `e2e-heal/SKILL.md`

- **Removed `hooks:` blocks** — All three skills previously declared `@specwright/hooks` modules in their frontmatter (`generation-summary`, `track-generated-files`, `capture-test-results`). These hooks are Desktop-app instrumentation only: they require callback wiring inside the agent-runner SDK to do anything useful, and all three return `{ continue: true }` without callbacks. Claude Code CLI ignores `hooks:` frontmatter entirely — a non-native extension. Removing them makes the plugin skills self-contained for public distribution without requiring `@specwright/hooks` (a private monorepo package). The Desktop app injects hooks via the agent-runner SDK directly, not via skill frontmatter.

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
