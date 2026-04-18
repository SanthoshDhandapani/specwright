/**
 * List Workflow — Phase 1 (@1-AddShows) step definitions.
 * Scoped to features matching @Workflows AND @ListWorkflow AND @1-AddShows.
 *
 * Phase 1 is an INTERMEDIATE PHASE: it is a consumer of Phase 0's predata AND
 * a producer of updated state for Phase 2. It:
 *   1. Loads predata via the Background's "I load predata from" step
 *      (shared/workflow.steps.js restores the localStorage snapshot via
 *      page.addInitScript before any navigation).
 *   2. Adds shows, mutating localStorage.
 *   3. Re-snapshots localStorage in its own After({ tags: '@precondition' })
 *      hook so Phase 2 sees the updated customLists.
 *
 * Shared steps used here (defined elsewhere):
 *   - "I am logged in"                                        (shared/auth.steps.js)
 *   - "I navigate to {string}"                                (shared/navigation.steps.js)
 *   - "I load predata from {string}"                          (shared/workflow.steps.js)
 *   - "the element with test ID {string} should be visible"   (shared/navigation.steps.js)
 *   - "I open the Add to List dropdown"                       (@ListWorkflow/steps.js)
 *   - "I close the Add to List dropdown"                      (@ListWorkflow/steps.js)
 *   - "I add the current show to the list {string}"           (@ListWorkflow/steps.js)
 *   - "the {string} option in the Add to List menu should be marked as added" (@ListWorkflow/steps.js)
 *   - "the Add to List menu should show at least one list option" (@ListWorkflow/steps.js)
 */
import { When, Then, After, expect } from '../../../../../playwright/fixtures.js';
import { saveScopedTestData, loadScopedTestData } from '../../../../../playwright/fixtures.js';

const WORKFLOW_SCOPE = 'listworkflow';
const APP_STORAGE_KEY = 'specwright-show-data';

// ---------------------------------------------------------------------------
// Show grid — positional helpers
// ---------------------------------------------------------------------------

function showCardLinks(page) {
  return page.locator(
    '[data-testid^="show-card-"]:not([data-testid*="poster"]):not([data-testid*="title"]):not([data-testid*="rating"])',
  );
}

function showCardTitles(page) {
  return page.locator('[data-testid^="show-card-title-"]');
}

When(
  'I capture the title of show card number {int} as {string}',
  async ({ page, scenarioContext }, position, alias) => {
    const index = position - 1;
    const titleEl = showCardTitles(page).nth(index);
    await expect(titleEl).toBeVisible();
    const text = (await titleEl.textContent())?.trim() || '';
    scenarioContext[alias] = text;
  },
);

When('I open show card number {int}', async ({ page }, position) => {
  const index = position - 1;
  const card = showCardLinks(page).nth(index);
  await expect(card).toBeVisible();
  await card.click();
});

Then(
  'the captured title {string} should differ from {string}',
  ({ scenarioContext }, aliasA, aliasB) => {
    const a = scenarioContext[aliasA];
    const b = scenarioContext[aliasB];
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toEqual(b);
  },
);

// ---------------------------------------------------------------------------
// Re-snapshot localStorage at end of each passing scenario in this file.
// Phase 1 is tagged @workflow-consumer (it consumes Phase 0 predata) but also
// produces state Phase 2 depends on. The file's path-scope (@1-AddShows)
// limits this hook to Phase 1 scenarios only — @workflow-consumer narrows
// within that scope and excludes the Background's unscoped steps.
// ---------------------------------------------------------------------------

After({ tags: '@workflow-consumer' }, async function ({ page, $testInfo }) {
  if ($testInfo?.status && $testInfo.status !== 'passed') return;

  let snapshot;
  try {
    snapshot = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, APP_STORAGE_KEY);
  } catch {
    return;
  }

  if (!snapshot) return;

  const existing = loadScopedTestData(WORKFLOW_SCOPE) || {};
  const merged = {
    ...existing,
    localStorage: {
      ...(existing.localStorage || {}),
      [APP_STORAGE_KEY]: snapshot,
    },
  };

  saveScopedTestData(WORKFLOW_SCOPE, merged);
});
