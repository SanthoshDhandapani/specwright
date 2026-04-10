---
name: e2e-generate
description: Generate Playwright BDD tests from a test plan — chains bdd-generator (feature files + step skeletons) → code-generator (Playwright implementations).
argument-hint: <plan-file-or-feature>
context: fork
hooks:
  PreToolUse:
    - matcher: Bash
      module: "@specwright/hooks/validate-bash"
      config:
        blockDestructive: true
  PostToolUse:
    - matcher: Write
      module: "@specwright/hooks/track-generated-files"
      config:
        outputDir: "e2e-tests/features/playwright-bdd"
        extensions: [".feature", ".js"]
---

# Test Generation

Generate complete BDD test files from a test plan.

## Agent Chain

```
@agent-bdd-generator
  → Creates .feature file (Gherkin scenarios, data tables, tags)
  → Creates steps.js skeleton (imports, step patterns, processDataTable wiring)
  → Output: READY_FOR_CODE_GENERATION

@agent-code-generator
  → Reads seed file for validated selectors
  → Fills in Playwright implementation code
  → Applies code quality rules (no RegExp constructors, semantic locators, auto-retrying assertions)
  → Output: Complete runnable steps.js
```

## Steps

### Step 0: Pre-read all inputs (BEFORE invoking any agent)

Read all files the agents will need, so they receive the content inline and skip file reads:

1. Plan file — from $ARGUMENTS or most recent in `e2e-tests/plans/`
2. `e2e-tests/playwright/generated/seed.spec.js` — validated selectors (skip if not present)
3. `e2e-tests/utils/stepHelpers.js` — FIELD_TYPES constants and processDataTable API
4. `e2e-tests/utils/testDataGenerator.js` — generateValueForField faker patterns

Pass all four file contents inline when invoking agents. The agents MUST NOT re-read these files — use the provided content directly.

### Step 1: Generate BDD Files

Invoke `@agent-bdd-generator` with:

- Plan file content (from Step 0)
- Module config (moduleName, category, subModuleName, fileName)

The agent creates both `.feature` and `steps.js` skeleton with correct imports, step patterns, and data table wiring.

### Step 2: Generate Playwright Code

Invoke `@agent-code-generator` with:

- The steps.js skeleton from Step 1
- Seed file content (from Step 0 — validated selectors already in context)
- stepHelpers.js content (from Step 0 — FIELD_TYPES and APIs already in context)
- testDataGenerator.js content (from Step 0 — faker patterns already in context)
- Plan file content (from Step 0)

The agent uses the provided content to fill in Playwright implementations — no file reads needed.

### Step 3: Verify (Optional)

If the user requests verification, invoke `@agent-playwright-test-generator` to:

- Execute the generated steps in a real browser via MCP
- Confirm selectors work against the live app

## Input: $ARGUMENTS

Pass the plan file path or module name:

```
/e2e-generate /e2e-tests/plans/feature-plan.md
/e2e-generate @ModuleName
```

## Output

Generated files in `/e2e-tests/features/playwright-bdd/{category}/@{Module}/`:

- `{feature}.feature` — Gherkin scenarios with tags and 3-column data tables
- `steps.js` — Complete step definitions with Playwright code
