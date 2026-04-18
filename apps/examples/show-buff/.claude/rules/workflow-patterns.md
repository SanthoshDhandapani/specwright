# Workflow Patterns

Cross-phase patterns for `@Workflows` test suites that require data (localStorage, cookies, app state) to survive between precondition and consumer phases.

---

### Per-Phase Project Isolation for Workflows

**Context:** Running `@0-Precondition` and `@1-Consumer` phase files under a single Playwright project with `workers: 1` caused `bddTestData not found` errors at runtime.
**Decision/Finding:** When a single worker is reused across phase spec files, playwright-bdd's `$bddContext` worker fixture holds stale data from the previous file. The fix is to run each phase in its OWN Playwright project so each phase gets a fresh worker pool:

```bash
npx playwright test --project setup --project precondition --project workflow-consumers --grep "@MyWorkflow"
```

The project chain is:
- `setup` — creates auth session (runs once, all projects consume it via storageState)
- `precondition` — runs `@precondition @cross-feature-data` tests, `workers: 1`, fresh worker
- `workflow-consumers` — runs `@workflow-consumer` tests in parallel, separate worker pool

**Reasoning:** Each Playwright project runs in its own worker pool. Moving across projects guarantees a clean process — no `$bddContext` leakage between `@0-*` and `@1-*` spec files.

**Do NOT use:** `--project run-workflow` as the default for workflow tests. `run-workflow` is a single-project shortcut that forces all phases through one worker — useful only when you explicitly want single-worker serial execution, not as the general path.

**EXCEPTION — 3+ phase workflows with an intermediate producer:** When a workflow has a phase that both consumes predata AND produces new state for a successor (e.g. `@0-Create → @1-Mutate (intermediate) → @2-Verify`), the default `precondition + workflow-consumers` routing causes a race: Phase 1 and Phase 2 both land in `workflow-consumers` (`fullyParallel: true`, no inter-file ordering), so Phase 2 can start before Phase 1 finishes. Use `--project setup --project run-workflow --grep "@MyWorkflow"` for these workflows — `run-workflow` preserves filesystem ordering (`@0-`, `@1-`, `@2-`) with `workers: 1 + fullyParallel: true` (fresh worker per file, no `$bddContext` leak).

---

### Cross-Phase localStorage Persistence

**Context:** Precondition scenarios that mutate `localStorage` (e.g., user creates a custom list, saves a draft, toggles a setting) found their writes invisible in consumer scenarios. Tests expecting the created state in Phase 1 got empty state instead.
**Decision/Finding:** `storageState` is a snapshot taken at auth-setup time (typically only auth keys like `app-auth-token`). Data written to `localStorage` DURING test phases is NOT captured — each new browser context starts fresh from `storageState`. Phase 0's writes are discarded when Phase 1 spins up a new context.

**Fix:** Snapshot localStorage explicitly at end of precondition via the 3-layer file-backed persistence (`saveScopedTestData`), then restore it in the consumer's `Before` hook using `page.addInitScript()` BEFORE the page script runs.

---

#### Pattern: First-phase snapshot (`@0-Precondition/steps.js`, tagged `@precondition`)

```javascript
import { After } from '<path>/fixtures.js';
import { saveScopedTestData } from '<path>/fixtures.js';

// After a successful precondition, snapshot the localStorage keys the app wrote.
// Saves into e2e-tests/playwright/test-data/{scope}.json (cross-worker safe).
After({ tags: '@precondition' }, async ({ page }, scenario) => {
  if (scenario.result?.status !== 'passed') return;
  const snapshot = await page.evaluate(() => ({
    myFeatureData: JSON.parse(localStorage.getItem('my-feature-data') || 'null'),
    // ...any other app-owned keys the precondition mutates
  }));
  saveScopedTestData('<workflow-scope>', { localStorage: snapshot });
});
```

#### Pattern: Intermediate-phase snapshot (`@N-Phase/steps.js`, tagged `@workflow-consumer @cross-feature-data`)

Intermediate phases (load predata AND save for a successor) are NOT tagged `@precondition` — that would route them into the serial `precondition` project and cause `$bddContext` leaks. Instead the hook matches on `@workflow-consumer`; path-based scoping restricts it to this phase's scenarios:

```javascript
import { After } from '<path>/fixtures.js';
import { saveScopedTestData, loadScopedTestData } from '<path>/fixtures.js';

After({ tags: '@workflow-consumer' }, async ({ page }, scenario) => {
  if (scenario.result?.status !== 'passed') return;
  const snapshot = await page.evaluate(() => ({
    myFeatureData: JSON.parse(localStorage.getItem('my-feature-data') || 'null'),
  }));
  // Merge with predata already on disk so successor phases see both the predecessor's and our updates.
  const existing = loadScopedTestData('<workflow-scope>') || {};
  saveScopedTestData('<workflow-scope>', {
    ...existing,
    localStorage: { ...(existing.localStorage || {}), ...snapshot },
  });
});
```

#### Pattern: Consumer restore (`@1-Consumer/steps.js`)

```javascript
import { Before } from '<path>/fixtures.js';
import { loadScopedTestData } from '<path>/fixtures.js';

// BEFORE the scenario navigates anywhere, inject the precondition's localStorage
// via addInitScript so the app sees the restored state on its first read.
Before({ tags: '@workflow-consumer' }, async ({ page }) => {
  const data = loadScopedTestData('<workflow-scope>');
  if (!data?.localStorage) return;
  await page.addInitScript((snap) => {
    for (const [key, value] of Object.entries(snap)) {
      if (value !== null) localStorage.setItem(key, JSON.stringify(value));
    }
  }, data.localStorage);
});
```

#### When to apply

✅ Apply when:
- The precondition scenario writes to `localStorage` (creates/toggles/saves state)
- A consumer scenario reads or asserts on that state

❌ Skip when:
- The precondition only affects server state (mutations via API calls) — the backend already persists it
- The precondition only asserts (read-only) — nothing to snapshot

#### Why `addInitScript` not `evaluate`

`page.evaluate()` runs AFTER the page's own scripts execute. By the time your restore fires, the app has already read `localStorage` (which is empty) and rendered its initial state. `page.addInitScript()` injects code BEFORE any page script runs on every navigation, so the app sees the restored state on its first read — no race condition.

**Reasoning:** Cross-phase app state that lives in the browser (not the server) needs an explicit snapshot/restore channel. The file-backed 3rd layer of our test-data persistence already handles cross-worker safety; the missing piece was the `addInitScript` injection timing.

---

### Workflow Feature-Flag / Cookie State

**Context:** Same failure mode as localStorage but for feature-flag cookies and session storage.
**Decision/Finding:** The same snapshot/restore pattern applies, just with different Playwright APIs:

- **Cookies:** `await context.cookies()` in the precondition's `After` → save to scoped test data → in the consumer's `Before`, call `await context.addCookies(...)`.
- **sessionStorage:** Read via `browser_evaluate` + `sessionStorage.getItem(...)` → save → restore via `addInitScript` (same as localStorage).

**When to apply:** Any time the precondition mutates client-only state that affects consumer behaviour.
