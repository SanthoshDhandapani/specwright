---
name: e2e-desktop-automate
description: Run the full 10-phase E2E test automation pipeline from Claude Desktop using @specwright/mcp — explores pages via bundled Playwright, generates BDD tests, and auto-heals failures. Single MCP server replaces all four separate servers.
argument-hint: <page-url-or-feature>
---

# E2E Desktop Automation Pipeline

Execute the complete 10-phase test automation workflow using the `@specwright/mcp` unified server.
All pipeline tools (Playwright browser, markitdown, Atlassian, and E2E pipeline) are accessed
through a single `mcp__specwright__*` namespace — no separate MCP config required.

## Pipeline Overview

```
Phase 1:   Initialization — read config, validate setup
Phase 2:   Detection & Routing — detect input type (jira/file/text)
Phase 3:   Input Processing — convert input to parsed test plan MD
Phase 4:   Exploration & Planning — explore app, discover selectors, write test plan
Phase 5:   Exploration Validation — run seed.spec.js, auto-heal failures (optional)
Phase 6:   ⛔ User Approval — present plan, wait for explicit approval
Phase 7:   BDD Generation — create .feature + steps.js files
Phase 8:   Test Execution & Healing — run tests, auto-heal failures (optional)
Phase 9:   Cleanup — aggregate results, remove intermediate files
Phase 10:  Final Review — quality score + formatted summary
```

## MCP Tools Used

All tools are under the single `mcp__specwright__` prefix (registered as `specwright` in mcp.json).

### Pipeline orchestration tools

| Tool | Purpose |
|------|---------|
| `mcp__specwright__e2e_configure` | Init setup, read/add config, get base URL + credentials |
| `mcp__specwright__e2e_explore` | Get exploration instructions (auth status, known selectors) |
| `mcp__specwright__e2e_plan` | Write seed.spec.js + plan markdown from discovered selectors |
| `mcp__specwright__e2e_status` | Check pipeline state (config, seed, plans, test results) |
| `mcp__specwright__e2e_automate` | Read instructions.js and get full pipeline plan |
| `mcp__specwright__e2e_execute` | Run seed or BDD tests with automatic project inference |
| `mcp__specwright__e2e_generate` | Generate .feature + steps.js via Anthropic API |
| `mcp__specwright__e2e_heal` | Iterative BDD test healing via Anthropic API (up to 3 iterations) |

### Browser tools (bundled Playwright — proxied from @playwright/mcp)

| Tool | Purpose |
|------|---------|
| `mcp__specwright__browser_navigate` | Navigate to page URL |
| `mcp__specwright__browser_snapshot` | Capture accessibility tree (primary exploration tool) |
| `mcp__specwright__browser_click` | Click elements by ref |
| `mcp__specwright__browser_type` | Type text into elements |
| `mcp__specwright__browser_fill` | Fill form fields |
| `mcp__specwright__browser_select_option` | Select dropdown options |
| `mcp__specwright__browser_press_key` | Press keyboard keys |
| `mcp__specwright__browser_hover` | Hover over elements |
| `mcp__specwright__browser_evaluate` | Run JS on page |
| `mcp__specwright__browser_console_messages` | Check console errors |
| `mcp__specwright__browser_network_requests` | Check network activity |
| `mcp__specwright__browser_close` | Close browser session |

### File conversion (bundled markitdown — proxied from markitdown-mcp)

Used in Phase 3 to convert Jira tickets, PDFs, or Word docs to markdown test plan input.

### Jira tools (bundled Atlassian — optional, requires ATLASSIAN_TOKEN)

Used in Phase 2/3 when `inputs.jira.url` is detected in config.

---

## Execution Steps

### Phase 1: Initialization

**BEFORE making any MCP tool calls**, determine whether `instructions.js` already has config entries:

Call `mcp__specwright__e2e_automate` → `{}` to check.

**Path A — `instructions.js` has entries:** use those configs. Skip to Phase 2.

**Path B — `instructions.js` is missing or empty, OR response contains `NEXT_ACTION: CALL_E2E_SETUP`:**

Call `mcp__specwright__e2e_setup` immediately — the user provides all configuration through the native form dialog that opens, not through chat.

⛔ Do NOT ask questions in chat before calling this — `e2e_setup` is the form that collects all required fields.
⛔ Do NOT call `e2e_configure` before this — it reads existing project modules and contaminates the form with project-specific suggestions.

```
mcp__specwright__e2e_setup({})
```

This opens Claude Desktop's native form UI — the user fills in all fields via a dialog (no typing into chat). The tool returns a complete config object when the user submits.

After the tool returns, confirm to the user in one line:

```
✅ Config collected: @<ModuleName> | <pageURL> | explore: yes/no | run tests: yes/no — starting pipeline.
```

Then call `mcp__specwright__e2e_configure` with `action: "init"` to validate project setup, and proceed with the config returned by `e2e_setup`.

### Phase 2: Detection & Routing

For each config entry, detect the input type:

- `inputs.jira.url` exists → Jira mode (fetch via Atlassian tools, convert with markitdown)
- `filePath` exists → File mode (convert with markitdown if PDF/Word)
- `instructions[]` has content → Text mode
- Otherwise → log error and skip

### Phase 3: Input Processing

**Jira mode** — fetch the ticket and convert to structured test plan:

1. Use Atlassian MCP tools to fetch the Jira issue
2. Convert to markdown via `mcp__specwright__convert_to_markdown` (or format directly)
3. Write parsed plan to `e2e-tests/plans/{moduleName}-parsed.md`

**File mode** — convert if needed:

1. If PDF/Word: convert via markitdown tools
2. Write parsed plan to `e2e-tests/plans/{moduleName}-parsed.md`

**Text mode** — format directly as markdown plan.

### Phase 4: Exploration & Planning

**If `explore: false`** — skip browser exploration entirely. Instead:
- If `pageURL` is localhost: grep `src/` for `data-testid` attributes and read relevant component files to infer selectors and UI structure. Use agent memory (`.claude/agent-memory/playwright-test-planner/MEMORY.md`) for any previously discovered selectors for this module.
- If `pageURL` is an external URL: write test cases based on Playwright best practices, using the parsed plan from Phase 3 as the only input. Skip `seed.spec.js` generation.
- Proceed directly to Phase 6 (User Approval).

**If `explore: true`** — run live browser exploration:

#### Step 4a: Get Exploration Context

**⛔ MANDATORY FIRST STEP — do NOT call any browser tool before this.**

Call `mcp__specwright__e2e_explore`:

```json
{
  "pageURL": "<pageURL from config>",
  "moduleName": "<moduleName>",
  "instructions": [],
  "authRequired": true
}
```

This returns: auth status, credentials, known selectors from memory, step-by-step exploration instructions.

**Credentials come from the `e2e_explore` response — check the auth data block before asking the user.**
- If credentials are present in the response → use them directly with browser tools. Do NOT ask in chat.
- If the auth data block says credentials are missing (e.g. `⚠️ TEST_USER_EMAIL not set`) → ask the user for them in chat.

#### Step 4b: Authenticate (if required)

**If AUTH_STATUS is `AVAILABLE`** — navigate directly to the target page. If the page redirects to login (saved auth state is stale), use the credentials from the `e2e_explore` auth data block.

**If AUTH_STATUS is `NOT_FOUND`** — saved auth state missing, authenticate immediately:

1. `mcp__specwright__browser_navigate` → `{ url: "<signinURL from auth data>" }`
2. `mcp__specwright__browser_snapshot` → identify login form fields
3. Fill credentials from the `e2e_explore` auth data block using `browser_fill` / `browser_type`
4. Submit and verify redirect to authenticated page

**If AUTH_STATUS is `NOT_REQUIRED`** — skip authentication, navigate directly.

**If AUTH_STATUS is `OAUTH_LOCALSTORAGE`** — run the `browser_evaluate` script from the response, then reload.

**CRITICAL:** Use the EXACT credentials from the `e2e_explore` response. Do NOT generate, guess, or ask the user for passwords.

#### Step 4c: Navigate & Explore

1. **Navigate to target page:**
   ```
   mcp__specwright__browser_navigate → { url: "<pageURL>" }
   ```

2. **Capture initial state:**
   ```
   mcp__specwright__browser_snapshot → full accessibility tree
   ```

3. **Explore interactive elements systematically (budget: 20 browser calls max):**

   For each element visible in the snapshot:
   - **Buttons/Links** — Record ref, text, role. Click to discover state changes, then snapshot.
   - **Form fields** — Record ref, label, type. Fill with test data, snapshot validation state.
   - **Dropdowns** — Click to open, snapshot the menu, then close.
   - **Tables/Lists** — Record structure, headers, row count.
   - **Navigation** — Check tabs, menus, pagination.

   **Use targeted snapshots** (`ref` parameter) after initial overview — not full-page snapshots after every click.

4. **Check for errors:**
   ```
   mcp__specwright__browser_console_messages → { level: "error" }
   ```

5. **Stop exploring when you have enough selectors** — don't exhaustively click every element.

#### Step 4d: Write Seed File & Plan

Build a selectors array from discovered elements (priority: testId > role > text > label > placeholder > CSS).

Call `mcp__specwright__e2e_plan`:

```json
{
  "moduleName": "@HomePage",
  "pageURL": "http://localhost:5173/home",
  "category": "@Modules",
  "selectors": [ ... all discovered selectors ... ],
  "behaviors": { "description": "...", "forms": [...], "tables": [...] },
  "scenarios": [ { "name": "...", "steps": [...], "type": "happy-path" } ],
  "instructions": [ ... original instructions ... ]
}
```

This writes:
- `e2e-tests/playwright/generated/seed.spec.js` — validated selectors
- `e2e-tests/plans/{moduleName}-{fileName}-plan.md` — full test plan

**After exploration:** update `.claude/agent-memory/playwright-test-planner/MEMORY.md` with all discovered selectors, navigation paths, and patterns.

### Phase 5: Exploration Validation (Optional)

**Skip if `runExploredCases` is false.**

Call `mcp__specwright__e2e_execute` to run `seed.spec.js`:

```json
{
  "mode": "seed",
  "projectPath": "<SPECWRIGHT_PROJECT>",
  "moduleName": "<moduleName>"
}
```

If failures occur: up to 3 healing iterations via `mcp__specwright__browser_snapshot` + selector fixes.
Goal: all seed tests passing before Phase 6 approval.

### Phase 6: User Approval

**Check `autoApprove` first:**

If every config entry being processed has `autoApprove: true` set, skip the blocking prompt entirely — output a single line and proceed directly to Phase 7:

```
✅ Auto-approved (autoApprove: true) — proceeding to BDD generation.
```

**Otherwise — ⛔ HARD STOP. Do NOT proceed to Phase 7 until the user explicitly replies.**

⛔ Do NOT write any `.feature` or `steps.js` files yet.
⛔ Do NOT call `e2e_generate` yet.
⛔ Do NOT assume the user has approved just because they pressed Continue or sent a message. Wait for an explicit "Approve" or "1".

Present the test plan summary including:

- Scenario count and names for each module
- **File paths to the full plan files** so the user can review detailed plans with selectors, steps, and data tables

Then ask the user to choose and **wait for their reply**:

1. Approve & Generate
2. View Full Plan
3. Modify & Retry

Only proceed to Phase 7 after the user chooses option 1 (or equivalent affirmation).

### Phase 7: BDD Generation

⛔ **Do NOT write `.feature` or `steps.js` content directly in chat or as artifacts.** The files must be written to disk by the MCP tool.

Call `mcp__specwright__e2e_generate` for each approved config:

```json
{
  "planFilePath": "e2e-tests/plans/{module-lowercase}-{fileName}-plan.md",
  "moduleName": "@{ModuleName}",
  "category": "@Modules",
  "fileName": "{fileName}"
}
```

Use the exact `moduleName`, `category`, and `fileName` from the config entry.
`planFilePath` is the path written by `e2e_plan` in Phase 4 — the filename format is `{moduleName-without-@-lowercase}-{fileName}-plan.md`.
Example: `moduleName: @HomePage`, `fileName: homepage` → `planFilePath: e2e-tests/plans/homepage-homepage-plan.md`.
The `e2e_plan` response includes the exact path — use it directly.

This tool generates `.feature` + `steps.js` and **writes them directly to disk** at the correct project paths. Do not attempt to create or present the file content yourself — wait for the tool response which confirms the file paths written.

Returns: scenario count, paths to generated files, any warnings.

**Performance:** The tool reads plan + seed + framework context internally — do NOT pre-read files or spawn Explore sub-agents.

### Phase 8: Test Execution & Healing (Optional)

⛔ **Check `runGeneratedCases` BEFORE doing anything in this phase.**

Read the config entries. If **every** entry has `runGeneratedCases: false` (or it is unset/falsy):

```
⏭️ Phase 8 skipped — runGeneratedCases: false for all configs.
```

Proceed directly to Phase 9. Do NOT call `e2e_execute`, `e2e_heal`, or any test runner.

**Only proceed below if at least one config has `runGeneratedCases: true`.**

⛔ **User Approval required before running any tests.** Present:

```
🧪 Ready to run generated tests for: @{ModuleName}
  - Project: {inferred playwright project}
  - Command: npx bddgen && npx playwright test --grep "@{moduleName}"

Run tests now? (yes / no)
```

Wait for the user to reply. Only call `e2e_heal` after the user confirms.

For each approved config entry, call `mcp__specwright__e2e_heal`:

```json
{
  "moduleName": "@{moduleName}",
  "projectPath": "<SPECWRIGHT_PROJECT>",
  "maxIterations": 3
}
```

This runs bddgen + playwright test with inferred projects, parses failures, applies Claude-generated fixes, and re-runs — up to 3 iterations. Run configs **sequentially** — each heal completes before the next begins.

Project inference (same as execution-manager):
- `@Workflows` category → `--project setup --project run-workflow`
- `@Authentication` or auth in name → `--project auth-tests`
- `@serial-execution` tag in feature → `--project setup --project serial-execution`
- All other `@Modules` → `--project setup --project main-e2e`

### Phase 9: Cleanup & Aggregation

Aggregate all results: configs processed, files generated, tests passed/failed, healing stats.

**Clean up intermediate files:**
```bash
rm -f e2e-tests/plans/*.md
```

Close browser session:
```
mcp__specwright__browser_close
```

### Phase 10: Final Review

Calculate a quality score from the aggregated pipeline data and display a formatted summary.

**Quality Score Formula (adaptive weights — skipped phases are excluded):**

```
Components (only include phases that actually ran):
  inputProcessingScore   = (successful configs / total configs) × 100     [always active]
  selectorDiscoveryScore = (validated selectors / total discovered) × 100 [if explore: true]
  testExecutionScore     = (passed tests / total tests) × 100            [if runGeneratedCases: true]
  healingSuccessScore    = (auto-fixed / total failures) × 100           [if healing ran]

Weights are redistributed among ACTIVE components only:
  - Generation only (explore + no execution): input=0.40, selectors=0.60
  - Generation + execution (no healing needed): input=0.25, selectors=0.25, execution=0.50
  - Full pipeline (all phases ran): input=0.20, selectors=0.20, execution=0.35, healing=0.25

This ensures a perfect generation-only run scores 100/100, not 76.5.
```

**Rating:** 95-100 Excellent ⭐⭐⭐⭐⭐ | 85-94 Very Good ⭐⭐⭐⭐ | 75-84 Good ⭐⭐⭐ | 60-74 Fair ⭐⭐ | 0-59 Poor ⭐

**Status:** score>=95 → "READY FOR PRODUCTION" | >=85 → "READY WITH MINOR FIXES" | >=75 → "REQUIRES ATTENTION" | >=60 → "NEEDS IMPROVEMENT" | else → "SIGNIFICANT ISSUES"

**Display format (use markdown sections — NOT ASCII box art):**

```markdown
# E2E AUTOMATION FINAL REVIEW
**{module name}** — {current date}

---

## 📊 Quality Score: {score}/100 {stars}
**{status}**

---

## 🎯 Generation Summary
- **Configs Processed:** {successful}/{total}
- **Feature Files:** {count} created
- **Step Definitions:** {count} files ({totalSteps} steps)
- **Scenarios:** {count} total
- **Duration:** {total pipeline time from Phase 1 start to Phase 10 end}

---

## 📁 Generated Files
- `{project_root}/{path_to_feature_file}`
- `{project_root}/{path_to_steps_file}`
- `{project_root}/{path_to_seed_file}`

---

## 🧪 Test Execution
{if tests ran: **Passed:** X/Y (Z%) | **Duration:** Ns}
{if skipped: Skipped — `runGeneratedCases: false`}

---

## 🔧 Healing
{if healing ran: **Attempts:** N | **Auto-fixed:** N | **Success Rate:** N%}
{if skipped: Skipped — no test failures or execution skipped}

---

## ⏭️ Skipped Phases
{list each: Phase N — reason (config flag)}

---

## 📋 Next Steps

Derive the exact run command from the generated module name and category:

- **`@Workflows`** category:
  ```
  pnpm test:bdd:workflows --grep "@{moduleName-lowercase}"
  ```
  Example for `@ListWorkflow`: `pnpm test:bdd:workflows --grep "@listworkflow"`

- **`@Modules`** category:
  ```
  pnpm test:bdd --grep "@{moduleName-lowercase}"
  ```
  Example for `@HomePage`: `pnpm test:bdd --grep "@homepage"`

Then show:
```
2. Fix failures: use /e2e-desktop-automate with runGeneratedCases: true
3. View report: open reports/playwright/index.html
```

---

**STATUS: {overallStatus}**
```

## Phase Transition Output (REQUIRED)

At the start of **every** phase, output a phase header as its own standalone line.

**Format** — the header MUST be preceded by a blank line and followed by a blank line:

```

### Phase N: <Phase Label>

```

All 10 phase headers:
```
### Phase 1: Initialization
### Phase 2: Detection & Routing
### Phase 3: Input Processing
### Phase 4: Exploration & Planning
### Phase 5: Exploration Validation
### Phase 6: User Approval
### Phase 7: BDD Generation
### Phase 8: Test Execution & Healing
### Phase 9: Cleanup
### Phase 10: Final Review
```

Rules:
- **NEVER** append `### Phase N:` directly after other text on the same line
- Always put a blank line before and after the `### Phase N:` header
- Do NOT wrap it in a bullet list item (no leading `- `)
- The `N` must match the exact phase number
- When a phase completes, move directly to the next phase header

## Progress Display

Show a todo list at start, update as each phase completes:

- □ Not started → 🔄 In progress → ✅ Complete / ⏭️ Skipped / ❌ Failed

## Error Handling

- **Browser tools unavailable:** `@playwright/mcp` not installed in `@specwright/mcp` — check server logs
- **Markitdown unavailable:** `uvx` not installed — Jira/file conversion falls back to raw text
- **Atlassian unavailable:** `ATLASSIAN_TOKEN` not set — Jira ticket fetch skipped, use `filePath` or `instructions[]` instead
- **Page load timeout:** Retry once, then report to user
- **Auth failure:** Report credentials issue, ask user to verify `.env.testing`
- **Missing instructions:** Ask user interactively for page URL, module name, and test instructions
- **Console errors on page:** Report them but continue exploration

## CRITICAL: Sequential Execution

Execute phases ONE BY ONE. Never run phases in parallel. Always wait for the current phase to complete before starting the next.
