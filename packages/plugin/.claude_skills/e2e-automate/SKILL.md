---
name: e2e-automate
description: Run the full 10-phase test automation pipeline — chains /e2e-process, /e2e-plan, /e2e-validate, /e2e-generate, /e2e-heal skills sequentially.
context: fork
---

# Test Automation Pipeline

Execute the complete test automation workflow by chaining skills sequentially.

## Pipeline Overview

```
Phase 1-2: Read config → Detect route (jira/file/text)
Phase 3:   /e2e-process (convert input to parsed test plan MD)
Phase 4:   /e2e-plan (explore app + generate test plan)
Phase 5:   /e2e-validate (validate seed file — optional)
Phase 6:   ⛔ USER APPROVAL CHECKPOINT
Phase 7:   /e2e-generate (create .feature + steps.js)
Phase 8:   /e2e-heal (run tests + auto-heal — optional)
Phase 9:   Cleanup
Phase 10:  Final review (quality score + formatted summary)
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

### Phase 3: Input Processing

Invoke `/e2e-process` with the appropriate input for each config entry:

- Jira mode: pass the Jira URL
- File mode: pass the file path
- Text mode: pass as text instructions

**Output:** Parsed MD file at `/e2e-tests/plans/{moduleName}-parsed.md`

### Phase 4: Exploration & Planning

Invoke `/e2e-plan` with the `pageURL` from each config entry.

- If `explore: true`: the skill explores the app via MCP, discovers selectors, writes seed file
- Saves test plan to `/e2e-tests/plans/{moduleName}-{fileName}-plan.md`
- **After exploration**: update `.claude/agent-memory/playwright-test-planner/MEMORY.md` with ALL discovered selectors, navigation paths, and patterns. Read the file first, then Edit to add new entries.

### Phase 5: Exploration Validation (Optional)

**Skip if `runExploredCases` is false.**

Invoke `/e2e-validate` to run the seed file tests and auto-heal failures.

### Phase 6: User Approval (MANDATORY)

⛔ **BLOCKING** — Do not proceed without explicit user approval.

Present the test plan summary including:

- Scenario count and names for each module
- **File paths to the full plan files** so the user can review detailed plans with selectors, steps, and data tables

Then ask:

1. Approve & Generate
2. View Full Plan
3. Modify & Retry

### Phase 7: BDD Generation

Invoke `/e2e-generate` with the approved plan file path for each config entry.
Creates complete `.feature` + `steps.js` files.

### Phase 8: Test Execution & Healing (Optional)

**Skip if `runGeneratedCases` is false.**

Invoke `/e2e-heal` to run the generated BDD tests and auto-heal failures (max 3 iterations).

### Phase 9: Cleanup & Aggregation

Aggregate all results: configs processed, files generated, tests passed/failed, healing stats.

**Clean up intermediate files:**

```bash
rm -f e2e-tests/plans/*.md
```

### Phase 10: Final Review

Calculate a quality score from the aggregated pipeline data and display a formatted summary.

**Quality Score Formula:**

```
qualityScore = (
  inputProcessingScore * 0.25 +    // (successful configs / total configs) × 100
  selectorDiscoveryScore * 0.20 +   // (validated selectors / total discovered) × 100, or 0 if no exploration
  testExecutionScore * 0.30 +       // (passed tests / total tests) × 100, or 70 if execution skipped
  healingSuccessScore * 0.25        // (auto-fixed / total failures) × 100, or 50 if healing skipped
)
```

**Rating:** 95-100 Excellent ⭐⭐⭐⭐⭐ | 85-94 Very Good ⭐⭐⭐⭐ | 75-84 Good ⭐⭐⭐ | 60-74 Fair ⭐⭐ | 0-59 Poor ⭐

**Status:** score>=95 → "READY FOR PRODUCTION" | >=85 → "READY WITH MINOR FIXES" | >=75 → "REQUIRES ATTENTION" | >=60 → "NEEDS IMPROVEMENT" | else → "SIGNIFICANT ISSUES"

**Display format:**

```
╔══════════════════════════════════════════════════════════════╗
║             E2E AUTOMATION FINAL REVIEW                      ║
║                  [{current date/time}]                        ║
╚══════════════════════════════════════════════════════════════╝

📊 QUALITY SCORE: {score}/100 {stars}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{rating}

🎯 GENERATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Configs Processed:  {successful}/{total}
  Feature Files:      {count} created
  Step Definitions:   {count} files ({totalSteps} steps)
  Scenarios:          {count} total

📁 GENERATED FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {list each .feature and steps.js with full path}

🧪 TEST EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {if tests ran: Passed: X/Y (Z%), Duration: Ns}
  {if skipped: "Skipped (runGeneratedCases: false)"}

🔧 HEALING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {if healing ran: Attempts: N, Auto-fixed: N, Success Rate: N%}
  {if skipped: "Skipped"}

⏭️  SKIPPED PHASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {list each skipped phase and reason}

📋 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Run tests: pnpm test:bdd
  2. Fix failures: /e2e-heal
  3. View report: pnpm report:playwright

╔══════════════════════════════════════════════════════════════╗
║  STATUS: {overallStatus}                                     ║
╚══════════════════════════════════════════════════════════════╝
```

## Progress Display

Show a todo list at start, update as each phase completes:

- □ Not started → 🔄 In progress → ✅ Complete / ⏭️ Skipped / ❌ Failed

## Error Handling

If any config fails: log error, continue with next config, mark as failed in summary.

## CRITICAL: Sequential Execution

Execute phases ONE BY ONE. Never run phases in parallel. Always wait for the current phase before starting the next.
