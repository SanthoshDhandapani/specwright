/**
 * Shared workflow steps — cross-workflow steps used by multiple @Workflows.
 * Lives in shared/ (no @-prefix) so it is globally scoped.
 *
 * Steps here:
 *   - "I load predata from {string}" — loads scoped JSON + restores localStorage for any workflow
 *   - "the home page loads with the show grid visible" — used by @FavoritesWorkflow and @ListWorkflow
 *   - "I click the first show card in the grid" — used by @FavoritesWorkflow and @ListWorkflow
 *   - "I am on the show detail page" — used by @FavoritesWorkflow and @ListWorkflow
 *
 * Moved here from shared/common.steps.js to keep domain-specific workflow steps
 * separate from generic UI utilities.
 */
import { Given, When, Then, expect } from '../../../playwright/fixtures.js';
import { loadScopedTestData } from '../../../playwright/fixtures.js';

/**
 * Poll for scoped test data until `movieStoreData` is present or timeout elapses.
 * Handles the race condition where a concurrent precondition worker hasn't yet written
 * the file (or the `movieStoreData` key) when this step executes.
 *
 * @param {string} scope - e.g. "listworkflow"
 * @param {number} timeoutMs - how long to poll (default 60 s)
 * @param {number} intervalMs - poll interval (default 2 s)
 * @returns {Object} loaded data (may be {} if timeout elapses without movieStoreData)
 */
async function waitForScopedTestData(scope, timeoutMs = 60000, intervalMs = 2000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const data = loadScopedTestData(scope);
    if (data.movieStoreData) {
      return data; // data is ready
    }
    // Wait and retry
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    console.log(`⏳ Waiting for "${scope}" predata (movieStoreData not yet available)...`);
  }

  // Timeout — return whatever is available (may be partial or empty)
  console.warn(`⚠️ Timed out waiting for "${scope}" predata with movieStoreData — proceeding with available data`);
  return loadScopedTestData(scope);
}

/**
 * Shared workflow predata loader — available to all workflow features.
 * Loads scoped JSON data into testData and restores app localStorage state
 * so workflow-consumers work correctly in a fresh browser context.
 *
 * Polls for up to 60 s when movieStoreData is missing — handles the race condition
 * where a concurrent precondition worker hasn't finished writing the data file yet.
 */
Given('I load predata from {string}', async ({ page, testData }, scope) => {
  // Poll until movieStoreData is available (up to 60 s) to handle concurrent preconditions
  const data = await waitForScopedTestData(scope);
  Object.assign(testData, data);
  const keys = Object.keys(data).filter((k) => k !== 'updatedAt').join(', ');
  console.log(`📦 Loaded predata from "${scope}": keys=[${keys}], movieStoreData=${!!data.movieStoreData}`);
  if (data.movieStoreData) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: 'specwright-show-data', value: data.movieStoreData },
    );
    console.log(`🗄️ Restored specwright-show-data to localStorage from "${scope}" predata`);
  }
});

/**
 * Home page + show grid steps — shared across FavoritesWorkflow and ListWorkflow.
 */
Given('the home page loads with the show grid visible', async ({ page, testConfig }) => {
  await page.goto(testConfig.routes.Home);
  await page.waitForLoadState('networkidle', { timeout: testConfig.timeouts.loadState });
  await expect(page.getByTestId('page-home')).toBeVisible({ timeout: testConfig.timeouts.element });
  await expect(page.getByTestId('show-grid')).toBeVisible({ timeout: testConfig.timeouts.element });
});

When('I click the first show card in the grid', async ({ page }) => {
  const firstCard = page.getByTestId('show-grid').locator('a[data-testid^="show-card-"]').first();
  await expect(firstCard).toBeVisible({ timeout: 10000 });
  await firstCard.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

Then('I am on the show detail page', async ({ page }) => {
  await expect(page).toHaveURL(/\/show\/\d+/, { timeout: 15000 });
  await expect(page.getByTestId('page-show-detail')).toBeVisible({ timeout: 10000 });
});
