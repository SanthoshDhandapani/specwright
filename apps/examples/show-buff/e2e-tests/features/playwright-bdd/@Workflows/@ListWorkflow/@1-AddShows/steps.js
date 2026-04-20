/**
 * Steps for @ListWorkflow Phase 1 — Add Shows to List
 * Scoped to @Workflows/@ListWorkflow/@1-AddShows/ via path-based scoping.
 *
 * Shared steps used here (from parent scopes):
 *   - Given I am logged in                  → shared/auth.steps.js
 *   - When I navigate to {string}           → shared/navigation.steps.js
 *   - Given I load predata from {string}    → shared/workflow.steps.js
 *
 * Data flow:
 *   Loads:  listId, listName from scope "listworkflow" (written by Phase 0)
 *   Saves:  show1Name, show2Name → merged into scope "listworkflow" for Phase 2
 */
import { When, Then, expect, saveScopedTestData, loadScopedTestData } from '../../../../../playwright/fixtures.js';

When('I click on the show {string}', async ({ page, testData }, showName) => {
  // Click the H3 heading inside a show card — it is a child of the anchor link
  await page.getByRole('heading', { name: showName, level: 3 }).first().click();
  await expect(page.getByTestId('page-show-detail')).toBeVisible();
  // Store for accumulation in the "show as added" assertion step
  testData.currentShowName = showName;
});

Then('the show detail page should display {string}', async ({ page }, showName) => {
  await expect(page.getByTestId('show-title')).toHaveText(showName);
  await expect(page.getByTestId('add-to-list-trigger')).toBeVisible();
});

When('I open the Add to List dropdown', async ({ page }) => {
  await page.getByTestId('add-to-list-trigger').click();
  await expect(page.getByTestId('add-to-list-menu')).toBeVisible();
});

When('I select the created list from the dropdown', async ({ page, testData }) => {
  const listId = testData.listId;
  await page.getByTestId(`add-to-list-option-${listId}`).click();
});

Then('the created list option should show as added', async ({ page, testData }) => {
  const listId = testData.listId;
  // Reopen dropdown if it closed after selection
  const menu = page.getByTestId('add-to-list-menu');
  if (!(await menu.isVisible())) {
    await page.getByTestId('add-to-list-trigger').click();
    await expect(menu).toBeVisible();
  }
  await expect(page.getByTestId(`add-to-list-option-${listId}`)).toContainText('✓');
  // Accumulate show name for later save (first show → show1Name, second → show2Name)
  if (!testData.show1Name) {
    testData.show1Name = testData.currentShowName;
  } else {
    testData.show2Name = testData.currentShowName;
  }
});

Then('I save the added shows as shared test data', async ({ page, testData }) => {
  // Snapshot updated localStorage (list now contains the added shows).
  const showData = await page.evaluate(() => {
    const raw = localStorage.getItem('specwright-show-data');
    return raw ? JSON.parse(raw) : null;
  });
  const existing = loadScopedTestData('listworkflow');
  // Write to a SEPARATE scope so Phase 2 can poll for this specific file.
  // Phase 1 and Phase 2 run concurrently in workflow-consumers; if Phase 1 overwrote
  // "listworkflow" (written by Phase 0), Phase 2 might already have read Phase 0's copy
  // before Phase 1 finished. "listworkflow-complete" only exists after Phase 1 writes it,
  // so Phase 2's waitForScopeFile correctly blocks until Phase 1 is done.
  saveScopedTestData('listworkflow-complete', {
    ...existing,
    show1Name: testData.show1Name || null,
    show2Name: testData.show2Name || null,
    localStorage: {
      ...(existing.localStorage || {}),
      'specwright-show-data': showData,
    },
  });
});
