---
name: e2e-automate
description: Run the full 10-phase test automation pipeline — chains /e2e-process, /e2e-plan, /e2e-validate, /e2e-generate, /e2e-heal skills sequentially.
context: fork
hooks:
  PreToolUse:
    - matcher: Bash
      module: "@specwright/hooks/validate-bash"
      config:
        blockDestructive: true
  Stop:
    - module: "@specwright/hooks/generation-summary"
---

# Test Automation Pipeline

Execute the complete test automation workflow by chaining skills sequentially.

## Pipeline Overview

```
Phase 1:   Initialization — read config, validate setup
Phase 2:   Detection & Routing — detect input type (jira/file/text)
Phase 3:   Input Processing — convert input to parsed test plan MD (/e2e-process)
Phase 4:   Exploration & Planning — explore app, discover selectors, write test plan (/e2e-plan)
Phase 5:   Exploration Validation — run seed.spec.js, auto-heal failures (optional, /e2e-validate)
Phase 6:   ⛔ User Approval — present plan, wait for explicit approval
Phase 7:   BDD Generation — create .feature + steps.js files (/e2e-generate)
Phase 8:   Test Execution & Healing — run tests, auto-heal failures (optional, /e2e-heal)
Phase 9:   Cleanup — aggregate results, remove intermediate files
Phase 10:  Final Review — quality score + formatted summary
```

## Execution Steps

### Phase 1: Initialization

Read `/e2e-tests/instructions.js` and validate configuration.

### Phase 2: Detection & Routing

For each config entry, detect the input type:

- `inputs.jira.url` exists → Jira mode
- `filePath` exists → File mode
- `instructions[]` exists → Text mode
- Otherwise → log error and skip

### Phase 3: Input Processing (`/e2e-process`)

Invoke `/e2e-process` with the appropriate input for each config entry:

- Jira mode: pass the Jira URL
- File mode: pass the file path
- Text mode: pass as text instructions

**Output:** Parsed MD file at `/e2e-tests/plans/{moduleName}-parsed.md`

### Phase 4: Exploration & Planning (`/e2e-plan`)

**If `explore: false`** — skip browser exploration entirely. Instead:
- If `pageURL` is localhost: grep `src/` for `data-testid` attributes and read relevant component files to infer selectors and UI structure. Use agent memory (`.claude/agent-memory/playwright-test-planner/MEMORY.md`) for any previously discovered selectors for this module.
- If `pageURL` is an external URL: write test cases based on Playwright best practices, using the parsed plan from Phase 3 as the only input. Skip `seed.spec.js` generation.
- Proceed directly to Phase 6 (User Approval).

**If `explore: true`** — invoke `/e2e-plan` with the `pageURL` from each config entry.

- Explores the app via MCP browser tools, discovers selectors, writes `seed.spec.js`
- Saves test plan to `e2e-tests/plans/{moduleName}-{fileName}-plan.md`
- **After exploration**: update `.claude/agent-memory/playwright-test-planner/MEMORY.md` with ALL discovered selectors, navigation paths, and patterns. Read the file first, then Edit to add new entries.

### Phase 5: Exploration Validation (`/e2e-validate`, Optional)

**Skip if `runExploredCases` is false.**

Invoke `/e2e-validate` to run `e2e-tests/playwright/generated/seed.spec.js` and auto-heal any failures — ensuring the explored selectors are solid before BDD generation begins.

- Runs ONLY the seed file (`seed.spec.js`) — NOT BDD feature files (those are Phase 8)
- If failures occur, heals them (selector fixes, timing fixes) via `@agent-playwright-test-healer` — up to 3 iterations
- Goal: all seed tests passing before proceeding to Phase 6 approval

### Phase 6: User Approval

**Check `autoApprove` first:**

If every config entry being processed has `autoApprove: true` set, skip the blocking prompt entirely — output a single line and proceed directly to Phase 7:

```
✅ Auto-approved (autoApprove: true) — proceeding to BDD generation.
```

**Otherwise — ⛔ User Approval (MANDATORY) BLOCKING:** Do not proceed without explicit user approval.

Present the test plan summary including:

- Scenario count and names for each module
- **File paths to the full plan files** so the user can review detailed plans with selectors, steps, and data tables

Then ask:

1. Approve & Generate
2. View Full Plan
3. Modify & Retry

### Phase 7: BDD Generation (`/e2e-generate`)

Invoke `/e2e-generate` with the approved plan file path for each config entry.
Creates complete `.feature` + `steps.js` files.

**Performance:** Proceed DIRECTLY — do NOT read agent definition files, do NOT spawn Explore sub-agents.
The plan file and seed file already contain all context needed. `/e2e-generate` handles the full chain internally.


### Phase 8: Test Execution & Healing (`/e2e-heal`, Optional)

**Skip entirely if no config has `runGeneratedCases: true`.**

For each config entry where `runGeneratedCases` is true, invoke `/e2e-heal` with the module tag:

```
/e2e-heal @{moduleName}
```

This passes the module name as a grep filter so `execution-manager` targets the correct feature files and infers the right Playwright projects (e.g. `precondition + workflow-consumers` for `@Workflows`, `auth-tests` for `@Authentication`, `main-e2e` for all other `@Modules`). Run configs **sequentially** — each heal completes up to 3 iterations before moving to the next config.

### Phase 9: Cleanup & Aggregation

Aggregate all results: configs processed, files generated, tests passed/failed, healing stats.

**Clean up intermediate files:**

```bash
rm -f e2e-tests/plans/*.md
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
2. Fix failures: `/e2e-heal`
3. View report: `pnpm report:playwright`
```

---

**STATUS: {overallStatus}**
```

## Phase Transition Output (REQUIRED)

At the start of **every** phase, output a phase header as its own standalone line.
This header is used by the Specwright Desktop app to visually separate phases into distinct cards.

**Format** — the header MUST be preceded by a blank line and followed by a blank line:

```

### Phase N: <Phase Label>

```

Full sequence for every phase transition:
```

### Phase 1: Initialization

<phase 1 content here>

### Phase 2: Detection & Routing

<phase 2 content here>

### Phase 3: Input Processing

<phase 3 content here>
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
- **NEVER** append `### Phase N:` directly after other text on the same line (e.g. `...available.### Phase 1:` is wrong)
- Always put a blank line before and after the `### Phase N:` header
- Do NOT wrap it in a bullet list item (no leading `- `)
- The `N` must match the exact phase number
- When a phase completes, move directly to the next phase header — don't re-announce completed phases

## Progress Display

Show a todo list at start, update as each phase completes:

- □ Not started → 🔄 In progress → ✅ Complete / ⏭️ Skipped / ❌ Failed

## Error Handling

If any config fails: log error, continue with next config, mark as failed in summary.

## CRITICAL: Sequential Execution

Execute phases ONE BY ONE. Never run phases in parallel. Always wait for the current phase before starting the next.
