---
name: e2e-plan
description: Create a test plan for a web page or feature using browser exploration, selector discovery, and scenario design.
argument-hint: <page-url-or-feature>
context: fork
agent: playwright-test-planner
---

# Test Planning Skill

Create a comprehensive test plan by exploring the application in a real browser.

## What This Does

1. Opens browser and navigates to the target page
2. Explores UI elements via MCP recording workflow
3. Discovers and validates selectors (priority: testId > role > text > label)
4. Identifies testable scenarios (happy path, edge cases, negative)
5. Generates a structured test plan + seed file with validated selectors
6. **Updates agent memory** with ALL discovered selectors and patterns

## Usage

```
/e2e-plan /home                        # Plan tests for a page
/e2e-plan http://localhost:5173/users  # Plan tests for a URL
/e2e-plan "Login flow"                  # Plan tests for a feature
```

## Input: $ARGUMENTS

Pass the page URL or feature description to plan tests for.

## Output (3 required)

1. **Seed file**: `e2e-tests/playwright/generated/seed.spec.js` (validated selectors)
2. **Test plan**: `e2e-tests/plans/{feature}-plan.md` (scenarios, steps, data dependencies)
3. **Memory update**: `.claude/agent-memory/playwright-test-planner/MEMORY.md` — ALL discovered selectors, navigation paths, reusable patterns, and known limitations written to the memory file
