---
name: e2e-run
description: Run BDD tests and report results. Use to quickly execute E2E tests without the full automation pipeline.
argument-hint: <project-or-tag>
context: fork
---

# Quick Test Runner

Run BDD tests quickly with optional filtering.

## What This Does

1. Runs `npx bddgen` to compile feature files
2. Runs `npx playwright test` with optional filters from $ARGUMENTS
3. Reports pass/fail summary
4. Opens HTML report if failures detected

## Usage

```
/e2e-run                                  # Run all BDD tests
/e2e-run --project auth-tests             # Run specific project
/e2e-run --grep @smoke                    # Run tests matching tag
/e2e-run --project setup --project main-e2e  # Run multiple projects
```

## Input: $ARGUMENTS

Optional Playwright CLI arguments (--project, --grep, --headed, --debug, etc.).

## Execution

```bash
npx bddgen && npx playwright test $ARGUMENTS
```

After the run, always output the report location:
```
HTML report: reports/playwright/  (open with: pnpm report:playwright)
```
