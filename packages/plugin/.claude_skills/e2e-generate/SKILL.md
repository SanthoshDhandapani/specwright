---
name: e2e-generate
description: Generate Playwright BDD tests from a test plan — chains bdd-generator (feature files + step skeletons) → code-generator (Playwright implementations).
argument-hint: <plan-file-or-feature>
context: fork
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

### Step 1: Generate BDD Files

Invoke `@agent-bdd-generator` with:

- Plan file path from $ARGUMENTS (or most recent plan in `/e2e-tests/plans/`)
- Module config (moduleName, category, subModuleName, fileName)

The agent creates both `.feature` and `steps.js` skeleton with correct imports, step patterns, and data table wiring.

### Step 2: Generate Playwright Code

Invoke `@agent-code-generator` with:

- The steps.js skeleton from Step 1
- Seed file at `e2e-tests/playwright/generated/seed.spec.js` (if exists)
- Plan file for context

The agent reads validated selectors from the seed file and fills in complete Playwright implementations.

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
