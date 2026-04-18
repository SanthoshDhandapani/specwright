---
name: e2e-run
description: Run BDD tests and report results. Use to quickly execute E2E tests without the full automation pipeline.
argument-hint: <script-name|tag|playwright-flags>
context: fork
---

# Quick Test Runner

Run BDD tests quickly with optional filtering. Accepts a package.json script name, a tag shorthand, or raw Playwright CLI flags.

## What This Does

1. Resolves the correct run command from $ARGUMENTS
2. Runs it
3. Reports pass/fail summary with scenario counts
4. Shows the report location on completion

## Usage

```
/e2e-run                          # Run everything (pnpm test:bdd)
/e2e-run test:bdd:auth            # Named package.json script
/e2e-run test:bdd:bookings        # Named package.json script (workflow)
/e2e-run @authentication          # Tag shorthand — infers projects automatically
/e2e-run @bookingworkflow         # Tag shorthand — workflow tag → run-workflow project
/e2e-run --grep "@smoke"          # Raw Playwright flags (you pick the projects)
/e2e-run --project main-e2e       # Raw Playwright project flag
```

---

## Step 0: Read project scripts (ALWAYS DO THIS FIRST)

Read `package.json` and extract all `test:bdd*` script entries. These are the canonical run commands for this project.

---

## Execution Logic

### Case 1: $ARGUMENTS matches a `test:bdd*` script name exactly

If `scripts[$ARGUMENTS]` exists in package.json (e.g. `test:bdd:auth`, `test:bdd:workflows`):

```bash
PLAYWRIGHT_HTML_OPEN=never pnpm $ARGUMENTS
```

These scripts already call `bddgen` + set the right `--project` flags. Do NOT add extra flags.

---

### Case 2: $ARGUMENTS is empty

Run all tests:

```bash
PLAYWRIGHT_HTML_OPEN=never pnpm test:bdd
```

---

### Case 3: $ARGUMENTS is a tag shorthand (starts with `@`)

Check if any `test:bdd*` script already covers this tag (grep its command string for the tag).

**If a matching script exists** → use it:
```bash
PLAYWRIGHT_HTML_OPEN=never pnpm <matching-script>
```

**If no matching script exists** → infer the right Playwright projects from the tag type:

| Tag type | Projects to use | Notes |
|---|---|---|
| `@authentication` or auth-related | `--project auth-tests` | No `setup` needed — auth-tests uses clean state to test the login form |
| `@precondition` | `--project setup --project precondition` | |
| `@workflow-consumer` | `--project setup --project precondition --project workflow-consumers` | Consumers depend on precondition data |
| `@*workflow*` (2-phase: one `@0-` producer + terminal `@N-` consumers) | `--project setup --project precondition --project workflow-consumers` | Each phase runs in its own worker pool — avoids `$bddContext` contamination between @0-Precondition and @1-Consumer |
| `@*workflow*` (3+ phases with an intermediate producer) | `--project setup --project run-workflow --grep "<tag>"` | When a workflow has `@0-Create → @1-Mutate (intermediate) → @2-Verify`, `workflow-consumers` (`fullyParallel: true`) has no inter-file ordering — Phase 2 could start before Phase 1 finishes. `run-workflow` uses `workers: 1 + fullyParallel: true` so files run sequentially via `@0-`/`@1-` filesystem order AND each gets a fresh worker. Detection: check the workflow dir for 3+ numbered phase directories where any non-`@0-` phase has both "I load predata from" AND a scoped-data save step/hook. |
| `@serial-execution` | `--project setup --project serial-execution` | Config already greps for this tag — adding `--grep` is redundant but harmless |
| Any other `@tag` | `--project setup --project main-e2e` | |

Then run:
```bash
PLAYWRIGHT_HTML_OPEN=never npx bddgen && PLAYWRIGHT_HTML_OPEN=never npx playwright test --project <resolved-projects> --grep "$ARGUMENTS"
```

**Why projects matter:** Workflow tests need the `precondition` project (runs `@precondition @cross-feature-data` tests with `workers: 1` in a fresh worker) AND `workflow-consumers` (runs `@workflow-consumer` tests in parallel in its own worker pool) — `setup` provides the auth session. Running them as separate projects avoids the `$bddContext` leakage that happens when a single worker reuses process state between phase files (surfaces as `bddTestData not found`). The `run-workflow` project still exists for users who explicitly want single-worker serial execution but is no longer the default.

---

### Case 4: $ARGUMENTS starts with `--` (raw Playwright flags)

```bash
PLAYWRIGHT_HTML_OPEN=never npx bddgen && PLAYWRIGHT_HTML_OPEN=never npx playwright test $ARGUMENTS
```

The caller is responsible for correct `--project` flags.

---

## After the Run

### Step 1: Show pass/fail summary

```
✓ Passed: N   ✕ Failed: N   ○ Skipped: N
```

If there are failures, list the failed scenario names from stdout.

### Step 2: Open reports

Check `package.json` scripts and run whichever exist:

**Playwright HTML report** — output the path only. Do NOT run `pnpm report:playwright` or `npx playwright show-report` — both start a blocking HTTP server on port 9323 that hangs the pipeline.

```
Playwright report: reports/playwright/index.html
  → To view: pnpm report:playwright
```

If no `report:playwright` script exists:
```
Playwright report: reports/playwright/index.html
  → To view: npx playwright show-report reports/playwright
```

**BDD cucumber report** — if `report:bdd` script exists, generate it first:
```bash
pnpm report:bdd
```
Output the path only (do NOT run `report:bdd:open` — it opens a blocking server):
```
BDD report: reports/cucumber-bdd/html-report/index.html
  → To view: pnpm report:bdd:open
```

If neither report script exists, output the path only:
```
Reports saved to: reports/playwright/
```

### Step 3: Final summary line

```
─────────────────────────────────────────
✓ N passed  ✕ N failed
Playwright report → reports/playwright/index.html
BDD report       → reports/cucumber-bdd/html-report/index.html
─────────────────────────────────────────
```
