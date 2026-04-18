/**
 * List Workflow — Phase 0 (@0-CreateList) step definitions.
 * Scoped to features matching @Workflows AND @ListWorkflow AND @0-CreateList.
 *
 * Phase 0 is the PRECONDITION phase: it creates the "My Top Shows" list and
 * snapshots the app's localStorage into the shared scoped-data file so that
 * Phase 1 (consumer) can restore it via page.addInitScript.
 *
 * Shared steps used here (defined elsewhere):
 *   - "I am logged in"                                        (shared/auth.steps.js)
 *   - "I navigate to {string}"                                (shared/navigation.steps.js)
 *   - "the element with test ID {string} should be visible"   (shared/navigation.steps.js)
 *   - "I create a custom list named {string}"                 (@ListWorkflow/steps.js)
 *   - "I submit the create list form with an empty name"      (@ListWorkflow/steps.js)
 *   - "I open the list card for {string}"                     (@ListWorkflow/steps.js)
 *   - "the list card for {string} should be visible"          (@ListWorkflow/steps.js)
 *   - "the list card for {string} should display a show count badge" (@ListWorkflow/steps.js)
 *   - "the lists empty state or grid should be present"       (@ListWorkflow/steps.js)
 *   - "the list detail heading should contain {string}"       (@ListWorkflow/steps.js)
 *   - "the URL should match the list detail pattern"          (@ListWorkflow/steps.js)
 *   - "the URL should end with {string}"                      (@ListWorkflow/steps.js)
 */
import { After } from '../../../../../playwright/fixtures.js';
import { saveScopedTestData, loadScopedTestData } from '../../../../../playwright/fixtures.js';

const WORKFLOW_SCOPE = 'listworkflow';
const APP_STORAGE_KEY = 'specwright-show-data';

/**
 * After any passing @precondition scenario, capture the app's localStorage so
 * subsequent consumer phases can restore it. Saves into
 * e2e-tests/playwright/test-data/listworkflow.json (cross-worker safe).
 *
 * The app persists favorites, watchlist, and customLists under a single
 * "specwright-show-data" key; we snapshot all three so later phases resume
 * from identical state.
 */
After({ tags: '@precondition' }, async function ({ page, $testInfo }) {
  if ($testInfo?.status && $testInfo.status !== 'passed') return;

  let snapshot;
  try {
    snapshot = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, APP_STORAGE_KEY);
  } catch {
    // Ignore if the page context is already closed
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
