# Specwright E2E Framework — Architecture Reference

> **Purpose**: Authoritative reference for the E2E framework architecture. Read this before modifying agents, skills, or plugin utilities. Violations of the invariants below have caused production regressions.

---

## Core Architecture — Three Layers

```
Layer 1: Playwright BDD runtime
  ├── playwright-bdd (Gherkin .feature → .spec.js compiler via bddgen)
  ├── playwright.config.ts (multi-project: serial, parallel, precondition, workflow-consumers)
  ├── fixtures.js (custom Given/When/Then exports, testData fixture, feature-level page reuse)
  ├── shared/ (globally-scoped steps: auth, navigation, common, global-hooks)
  ├── utils/stepHelpers.js (processDataTable, validateExpectations, FIELD_TYPES)
  └── utils/testDataGenerator.js (faker-based value generation for 20+ field types)

Layer 2: AI agent pipeline (Claude Code agents + skills)
  ├── 8 agents (pure building blocks — skills chain them, agents NEVER invoke each other)
  ├── 7 skills (/e2e-automate, /e2e-plan, /e2e-generate, /e2e-process, /e2e-heal, /e2e-validate, /e2e-run)
  └── Agent memory (.claude/agent-memory/ — persists selectors, patterns, fixes across sessions)

Layer 3: Desktop app (Electron UI wrapper around Layer 2)
  ├── pipeline.ipc.ts (injects MCP servers with --output-dir, manages agent SDK)
  ├── ConfigPanel.tsx (env var management, auth config)
  └── CenterPanel.tsx (phase display, run/stop controls)
```

---

## Architectural Invariants

These MUST NEVER be violated. Each was learned from a real regression.

### 1. stepHelpers.js is the ONLY source of FIELD_TYPES

Constants like `COMBO_BOX`, `FILL_AND_ENTER`, `TOGGLE_BY_TYPE_DATA_CY`, `TEXT_VALIDATION_BY_DATA_CY` exist ONLY in `packages/plugin/e2e-tests/utils/stepHelpers.js`. These are used in enterprise-grade step files (e.g. yms-ui's 83KB `checkin-checkout.steps.js` with 13 FIELD_TYPES). The code-generator agent MUST read this file. It CANNOT be replaced by inline documentation because it evolves as new UI patterns are added.

**Wrong**: Telling code-generator "Do NOT read stepHelpers.js"
**Right**: Skill pre-reads it and passes inline; agent skips disk read if content already provided

### 2. testDataGenerator.js drives all `<gen_test_data>` resolution

faker patterns for 20+ field types. code-generator MUST read it so `FIELD_MAPPING` and `FIELD_CONFIG` entries in generated steps match what will actually be generated at runtime.

### 3. fixtures.js is the ONLY valid import source for step files

Never import from `playwright-bdd`, `@playwright/test`, or `@cucumber/cucumber` directly. Import path depth = (directory depth from `playwright-bdd/` + 2) levels of `../`.

```javascript
// Correct — 4 levels up from playwright-bdd/@Modules/@HomePage/steps.js
import { Given, When, Then } from '../../../../fixtures.js';

// Wrong
import { Given, When, Then } from 'playwright-bdd';
```

### 4. 3-column data table format is universal

Every form interaction uses `| Field Name | Value | Type |`.

- `<gen_test_data>` → generates value via faker, caches it
- `<from_test_data>` → reads cached value, asserts it

Both wired through `processDataTable` / `validateExpectations` from `stepHelpers.js`.

### 5. 3-layer test data persistence is non-negotiable

```
page.testData         (scenario-scope, in-memory per scenario)
    ↓ promoted on feature end
featureDataCache      (feature-scope, in-memory, single worker)
    ↓ persisted for cross-worker access
test-data/{scope}.json  (file-backed, readable by any parallel worker)
```

These three layers exist because parallel Playwright workers cannot share in-memory state. Removing any layer breaks cross-worker data sharing.

### 6. Scoping: shared/ is global, @-prefixed dirs are AND-scoped

Steps in `shared/` are visible to ALL features. Steps in `@Modules/@Auth/steps.js` are ONLY visible to features that match **both** the `@Modules` AND `@Auth` tags (playwright-bdd v8+ path-based scoping).

Cross-module reusable steps MUST live in `shared/`.

### 7. Plan file lists which shared steps apply — don't scan shared/

The plan file's "Shared steps to reuse" section is the authoritative list for a given module. `bdd-generator` reads it from there. Scanning all of `shared/` to discover applicable steps is redundant, slow, and was causing 2+ minute hangs in Phase 7.

Reading ONE specific shared step file to verify a signature is acceptable. Reading all of them is not.

### 8. Seed file = validated selectors from browser exploration

`e2e-tests/playwright/generated/seed.spec.js` is produced by the playwright-test-planner agent during Phase 4. code-generator reads it to extract real, browser-validated selectors. It MUST NOT invent selectors from scratch.

### 9. Skills own orchestration, agents are pure

Skills pre-read files and pass content inline to agents. Agents check "was content provided inline?" and skip disk reads if so.

```
Skill (SKILL.md):
  Step 0: Read plan, seed, stepHelpers.js, testDataGenerator.js
  Step 1: Pass all 4 to bdd-generator → inline content, no re-reads needed
  Step 2: Pass all 4 to code-generator → inline content, no re-reads needed

Agent:
  "Read stepHelpers.js (skip if content was already provided inline by the calling skill)"
```

Agents NEVER invoke other agents directly. Skills are the only orchestrators.

### 10. Output paths are deterministic from plan fields

```
Feature file: e2e-tests/features/playwright-bdd/{Category}/@{Module}/{FileName}.feature
Steps file:   e2e-tests/features/playwright-bdd/{Category}/@{Module}/steps.js
```

`Category`, `Module`, and `FileName` come directly from the plan file header. No directory scanning, `ls`, or `find` is needed to determine the output path.

---

## Agent Pipeline Overview

| Agent | Role | Key Inputs | Key Outputs |
|-------|------|-----------|-------------|
| `playwright-test-planner` | Browser exploration + test plan | Live app URL, .env.testing | seed.spec.js, test-plan.md |
| `bdd-generator` | Feature file + steps skeleton | Plan file, stepHelpers.js | .feature, steps.js (skeleton) |
| `code-generator` | Playwright implementation | Steps skeleton, seed.spec.js, stepHelpers.js, testDataGenerator.js | steps.js (complete) |
| `test-runner` | Execute BDD tests | Test suite | Results, failures |
| `test-healer` | Fix broken selectors/steps | Failure log, seed.spec.js | Patched steps.js |
| `test-validator` | Quality review | Generated files | Score, issues |
| `test-processor` | Post-process results | Raw results | Formatted report |
| `spec-reviewer` | Review generated specs | .feature, steps.js | Quality feedback |

---

## Skill → Agent Chain Map

```
/e2e-automate   (10-phase pipeline)
  Phase 4: → @playwright-test-planner (browser exploration)
  Phase 7: → @bdd-generator → @code-generator (BDD generation)
  Phase 8: → @test-runner
  Phase 9: → @test-healer (if failures)
  Phase 10: → @test-validator + @spec-reviewer

/e2e-plan       → @playwright-test-planner

/e2e-generate   → @bdd-generator → @code-generator

/e2e-run        → @test-runner

/e2e-heal       → @test-healer

/e2e-validate   → @test-validator

/e2e-process    → @test-processor
```

---

## Framework Change Guidelines

### The only valid reason to remove a file Read from an agent

The calling skill already reads the file and passes its content inline. The correct fix is to add a "skip if content was already provided inline" note to the agent instruction. Never remove the read entirely if the file contains unique information not available elsewhere.

### stepHelpers.js / testDataGenerator.js are NEVER replaceable with inline docs

These files evolve. At time of writing, yms-ui uses 13 distinct FIELD_TYPES. A future project could add more. The agent must read the current file version each time to generate accurate code. Inline documentation in agent files will always lag behind the actual file.

### The pre-read optimization pattern (correct)

```
Skill (e2e-generate SKILL.md):
  Step 0: Read plan, seed, stepHelpers.js, testDataGenerator.js
  Step 1: Pass all 4 to bdd-generator inline → agents receive content, skip 3-4 file reads
  Step 2: Pass all 4 to code-generator inline

Agent (code-generator.md):
  "Read stepHelpers.js (skip if content was already provided inline)"
```

This saves 3-4 sequential file reads per invocation without breaking correctness.

### Adding a new FIELD_TYPE

1. Add the constant to `packages/plugin/e2e-tests/utils/stepHelpers.js`
2. Add the faker pattern to `packages/plugin/e2e-tests/utils/testDataGenerator.js`
3. The agents will pick it up automatically on the next run — no agent file edits needed

### Adding a new shared step

1. Add it to the appropriate file in `e2e-tests/features/playwright-bdd/shared/`
2. Update the relevant test plan's "Shared steps to reuse" section
3. bdd-generator will include it because it reads the plan's shared steps list

---

## Known Past Mistakes (and Why They Were Wrong)

| Bad Change | Why Wrong |
|-----------|-----------|
| `code-generator.md`: "Do NOT read stepHelpers.js/testDataGenerator.js" | These files have FIELD_TYPES (COMBO_BOX, etc.) not available anywhere else — removing reads breaks code generation for complex forms |
| `e2e-generate/SKILL.md`: "Do NOT read utility files" in Step 2 | Was forbidding essential reads; correct fix is Step 0 pre-read at skill level |
| `show-buff/.mcp.json`: Removed `playwright-test` entry entirely | CLI users need it for `/e2e-automate` without Desktop app; fix is to add `--output-dir`, not remove the entry |
| `bdd-generator.md`: "Read ALL files in shared/" | Plan file already lists applicable shared steps; scanning all of shared/ causes 2+ min hang |
| `bdd-generator.md`: No explicit output path formula | Agent explores directory tree to find "the right location"; fix is the deterministic formula above |
| `playwright-test-planner.md`: Auto-detect OAUTH_STORAGE_KEY by grepping src/ | OAUTH_STORAGE_KEY must be explicit in .env.testing; auto-detection is fragile and can return wrong keys |

---

## Playwright Project Execution Lanes

`playwright.config.ts` defines 8 named projects. Each is an isolated execution lane with its own tag filter, worker count, auth state, and dependency chain.

| Project | Tag filter | Workers | storageState | Depends on |
|---------|-----------|---------|-------------|------------|
| `setup` | `**/auth.setup.js` | 1 | — | — |
| `auth-tests` | `**/@Authentication/*.spec.js` | default | none (clean) | — |
| `serial-execution` | `@serial-execution` ∧ ¬`@precondition` ∧ ¬`@workflow-consumer` | 1 | user.json | setup |
| `precondition` | `@precondition` | 1 | user.json | setup |
| `workflow-consumers` | `@workflow-consumer` | default (parallel) | user.json | precondition |
| `run-workflow` | `**/@Workflows/**` | 1 | user.json | setup |
| `chromium` | `e2e-tests/playwright/generated/**` | default | none | — |
| `main-e2e` | ¬`@serial-execution` ∧ ¬`@precondition` ∧ ¬`@workflow-consumer` | default (parallel) | user.json | setup |

### Execution order during `pnpm test:bdd`

```
setup  ──────────────────────────────────────────────────────┐
                                                              ▼
auth-tests          (parallel, clean state, no deps)
serial-execution    (1 worker, @serial-execution modules)   ←─┘ after setup
precondition        (1 worker, @precondition workflows)     ←─┘ after setup
                                                              ▼
workflow-consumers  (parallel, after precondition)
main-e2e            (parallel, after setup)
```

`chromium` and `run-workflow` are **never triggered by `pnpm test:bdd`** — invoked explicitly only (`npx playwright test --project chromium`, `pnpm test:bdd:bookings`, etc.).

### Tag routing rules

- `@serial-execution` → `serial-execution` project (not `main-e2e`)
- `@precondition` → `precondition` project (not `serial-execution`, not `main-e2e`)
- `@workflow-consumer` → `workflow-consumers` project (not `serial-execution`, not `main-e2e`)
- Everything else → `main-e2e`

**Critical**: `serial-execution` MUST have `grepInvert: /@precondition|@workflow-consumer/` and `main-e2e` MUST have `grepInvert: /@serial-execution|@precondition|@workflow-consumer/`. Without these exclusions, workflow tests bleed into the wrong lane and fail because precondition data doesn't exist yet.

### `chromium` project — seed spec validation

The `chromium` project has a dedicated `testDir: './e2e-tests/playwright/generated'` pointing exclusively at the seed file written by the planner agent. It has:
- No `storageState` — seed files inject auth themselves via `localStorage.setItem`
- No `dependencies` — runs independently, not part of the BDD setup chain
- Used by `execution-manager` agent in Phase 5 to validate discovered selectors before BDD generation

### Seed file auth invariants

These three rules apply to EVERY seed file:

1. **`OAUTH_STORAGE_KEY` has no fallback** — `const OAUTH_STORAGE_KEY = process.env.OAUTH_STORAGE_KEY;`. No `|| 'some-key'`. If it is missing from `.env.testing`, the test fails loudly with `undefined` rather than silently writing the wrong key to localStorage.

2. **`picture` is never hardcoded** — `const TEST_USER_PICTURE = process.env.TEST_USER_PICTURE || '';`. The evaluate call passes it as a closure argument, never as an inline string literal.

3. **Env vars are passed through the closure argument** — `page.evaluate()` runs in browser context where `process.env` is unavailable. All Node.js values must be passed via the second argument:
   ```javascript
   await page.evaluate(
     ({ key, name, email, picture }) => { localStorage.setItem(key, JSON.stringify({ name, email, picture })); },
     { key: OAUTH_STORAGE_KEY, name: TEST_USER_NAME, email: TEST_USER_EMAIL, picture: TEST_USER_PICTURE }
   );
   ```

### MCP browser localStorage ghost keys

The `playwright-mcp` server uses a **persistent browser profile** (`.playwright-mcp/`). LocalStorage written during one exploration session persists to the next. If the planner agent previously used a wrong/fallback `OAUTH_STORAGE_KEY`, that key remains in the MCP browser's localStorage permanently until explicitly cleared. It does not affect test correctness (tests use fresh browser contexts), but it appears in DevTools during exploration sessions.

**Prevention**: No fallback in `OAUTH_STORAGE_KEY` (see invariant 1 above) and always read `OAUTH_STORAGE_KEY` from `.env.testing` before any `browser_evaluate` call.

---

## Auth Configuration (Two-Layer Architecture)

### Runtime (canonical) — `.env.testing`

All auth runtime config lives here. Plugin + Claude CLI reads only from this file.

```
AUTH_STRATEGY=oauth|email-password|none
TEST_USER_EMAIL=
TEST_USER_PASSWORD=           # email-password only
TEST_USER_NAME=               # optional — derived from email if blank
TEST_USER_PICTURE=            # optional — SVG initials auto-generated if blank
OAUTH_STORAGE_KEY=            # mandatory for oauth (localStorage key)
OAUTH_SIGNIN_PATH=            # default: /signin
OAUTH_BUTTON_TEST_ID=         # click-based fallback
OAUTH_POST_LOGIN_URL=         # default: **/
```

### Desktop metadata — `.specwright.json`

Plugin identity and overlay discovery only. No auth config here.

```json
{
  "plugin": "@specwright/plugin",
  "authStrategy": "oauth"
}
```

`authStrategy` here is readonly overlay metadata used by `detectPlugin()` for overlay discovery. It is NOT written by the Desktop UI. Auth runtime config (credentials, keys, paths) lives exclusively in `.env.testing`.

---

## Screenshot / MCP Output Directories

Playwright MCP screenshots must go to `.playwright-mcp/` (gitignored). This is set via `--output-dir`:

- **Desktop app** (`pipeline.ipc.ts`): injects `--output-dir <projectPath>/.playwright-mcp` at runtime
- **CLI** (`.mcp.json` in project root): must have `"--output-dir", ".playwright-mcp"` in playwright-test args
- **Plugin template** (`mcp.json.template`): same — all new projects get the correct output dir

The Desktop app deduplicates MCP servers (line 173 in `pipeline.ipc.ts`): `if (mcpServers[name]) continue`. Its entry wins over `.mcp.json`, so there's no conflict when both are present.

---

## Plugin Selection Architecture

### Default Behavior

`ProjectService.bootstrap()` always installs `@specwright/plugin` as the base plugin. This is the default — no user action required. The base plugin is open-source, generic, and works for any web application.

Until the user explicitly changes the plugin in ConfigPanel, the project uses only the base plugin.

### Changing the Plugin (Two Import Modes)

#### 1. npm Ecosystem

```
Plugin source: npm package
  ├── Package name: specwright-plugin-acme-corp   ← naming convention: specwright-plugin-*
  ├── Registry: (blank) = npmjs.com               ← or custom: https://npm.acme.com
  └── Install: npm install {name}, then run install.sh
```

**Naming convention**: Community plugins use `specwright-plugin-*` with `keywords: ["specwright-plugin"]` in `package.json`. Organizations can publish to private npm registries — the user provides the registry URL in ConfigPanel.

**Custom registry**: Supported via `--registry` flag to npm. Can also be set project-wide via `.npmrc` in the project root.

**Discovery (future)**: npm search API (`npm search specwright-plugin --json`) will surface community plugins in a marketplace view.

#### 2. Local Directory Import

```
Plugin source: local path
  ├── User browses to: /path/to/fourkites-ai-plugins/plugins/fourkites-e2e/
  ├── Validation (3 levels):
  │     Level 1: specwright.plugin.json present + valid JSON + required fields (name, version, type)
  │     Level 2: install.sh present
  │     Level 3: all paths in overrides[] exist inside the overrides/ directory
  └── If valid: plugin name read from specwright.plugin.json
```

**Detection signal**: `specwright.plugin.json` at the root of the plugin directory is the canonical signal. Any directory without this file is rejected immediately.

### 3-Level Plugin Validation

Applied to any local directory before accepting it as a valid plugin source:

| Level | Check | Fail message |
|-------|-------|-------------|
| 1 | `specwright.plugin.json` exists + is valid JSON + has `name`, `version`, `type` fields | "Not a Specwright plugin — specwright.plugin.json missing or malformed" |
| 2 | `install.sh` exists | "Plugin is missing install.sh" |
| 3 | Every path in `overrides[]` exists inside the `overrides/` directory | "Plugin overrides missing: {list of missing files}" |

### Overlay Install Sequence

An overlay plugin installs **on top of** the base plugin, replacing specific files:

```
bootstrap(projectPath, { overlaySource })
  Step 1: Install @specwright/plugin base (always)
  Step 2: If overlay is configured:
    ├── Resolve overlay directory (local path, npm package, or .specwright.json overlayPath)
    ├── Run: bash install.sh <projectPath>
    │     → copies overrides/ files on top of base plugin files
    │     → updates AUTH_STRATEGY in e2e-tests/.env.testing
    │     → copies specwright.plugin.json to project root (overlay manifest)
    └── Write overlay metadata to .specwright.json
```

`.specwright.json` records the overlay for future `detectPlugin()` calls:

```json
{
  "plugin": "@specwright/plugin",
  "overlay": "fourkites-e2e",
  "overlayPath": "../fourkites-ai-plugins/plugins/fourkites-e2e"
}
```

`overlayPath` is relative to the project root. On re-bootstrap, this lets `ProjectService` find the overlay directory without user interaction.

### Overlay Resolution Order (resolveOverlayPath)

When `bootstrap()` needs the overlay directory, it tries these sources in order:

1. **Explicit `overlayPath`** in `.specwright.json` — resolved relative to project root
2. **Sibling scan** — `../../{overlayName}/install.sh` (works for monorepo layouts like `fourkites-ai-plugins/plugins/{name}`)
3. **npm resolution** — `require.resolve('{overlayName}/install.sh')` — works when overlay is installed as a package

Returns `null` if none found — bootstrap logs a warning and continues without overlay.

### Future: Git Connectivity

Phase 2 (not yet implemented):

- OAuth connect GitHub / GitLab / Bitbucket — same pattern as the Atlassian MCP integration
- Browse public repos by topic `specwright-plugin`
- Browse org private repos after OAuth
- One-click install: clone repo to temp dir → validate (3-level) → run `install.sh` → activate on project
- Connected git accounts stored in Desktop app config (never in `.specwright.json`)
