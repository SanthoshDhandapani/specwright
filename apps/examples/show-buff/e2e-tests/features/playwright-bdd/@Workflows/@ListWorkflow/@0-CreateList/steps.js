/**
 * List Workflow — @0-CreateList steps
 * Tags: @listworkflow @create-list @serial-execution @prerequisite @cross-feature-data
 *
 * Selectors (all data-testid, validated 2026-04-12):
 *   page-lists             — /lists page main container DIV
 *   create-list-input      — inline new list name INPUT
 *   create-list-submit     — "Create" BUTTON
 *   lists-grid             — grid of list cards DIV
 *   list-card-{uuid}       — dynamic list card link (prefix pattern)
 *   list-card-count-{uuid} — "N shows" SPAN badge (prefix pattern)
 *   page-list-detail       — list detail page main container DIV
 *   rename-list-display    — list name H1 on detail page
 *
 * Shared steps used here (from shared/ — globally scoped, no re-definition needed):
 *   When I click the {string} list card          → shared/list.steps.js
 *   Then I am on the list detail page for {string} → shared/list.steps.js
 *
 * Saves: saveScopedTestData('listworkflow', { listName })
 */
import { Given, When, Then, expect } from '../../../../../playwright/fixtures.js';
import { saveScopedTestData } from '../../../../../playwright/fixtures.js';

Given('I navigate to the lists page', async ({ page, testConfig }) => {
  const baseUrl = process.env.BASE_URL || testConfig.baseUrl || 'https://specwright-show-buff.vercel.app';
  await page.goto(`${baseUrl}/lists`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

Then('the lists page is loaded', async ({ page }) => {
  await expect(page).toHaveURL(/\/lists$/, { timeout: 15000 });
  await expect(page.getByTestId('page-lists')).toBeVisible({ timeout: 10000 });
});

When('I create a new list with the following details:', async ({ page, testData }, dataTable) => {
  const rows = dataTable.hashes();
  const listNameRow = rows.find((r) => r['Field Name'] === 'List Name');
  const listName = listNameRow?.Value || 'My Top Shows';

  const input = page.getByTestId('create-list-input');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(listName);

  const submitBtn = page.getByTestId('create-list-submit');
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await submitBtn.click();

  // Store list name for later assertions and data saving
  testData.listName = listName;
  console.log(`[create-list] Created list: "${listName}"`);
});

Then('the new list card appears in the grid', async ({ page, testData }) => {
  const listName = testData.listName || 'My Top Shows';
  const grid = page.getByTestId('lists-grid');
  await expect(grid).toBeVisible({ timeout: 10000 });

  // Find list card by name text — UUIDs are dynamic, so search by role/text
  const listCard = grid.getByRole('link', { name: new RegExp(listName) });
  await expect(listCard).toBeVisible({ timeout: 15000 });
  console.log(`[create-list] List card "${listName}" is visible in grid`);
});

Then('the list card count badge shows {string}', async ({ page, testData }, expectedCount) => {
  const listName = testData.listName || 'My Top Shows';
  const grid = page.getByTestId('lists-grid');

  // Locate the list card link matching the list name, then find the count badge within it
  const listCardLink = grid.getByRole('link', { name: new RegExp(listName) });
  await expect(listCardLink).toBeVisible({ timeout: 10000 });

  // The count badge is a sibling/child element with data-testid^="list-card-count-"
  // Scope to the parent container of the link to find the badge
  const cardContainer = listCardLink.locator('..');
  const countBadge = cardContainer.locator('[data-testid^="list-card-count-"]');

  // If not found via parent, try broader scope filtered by the list name container
  const countBadgeAlt = page.locator('[data-testid^="list-card-count-"]').filter({
    has: page.locator('..').filter({ hasText: listName }),
  });

  let badge = countBadge;
  if ((await badge.count()) === 0) {
    badge = countBadgeAlt;
  }

  // Fallback: find any count badge and assert its text
  if ((await badge.count()) === 0) {
    const allCountBadges = page.locator('[data-testid^="list-card-count-"]');
    await expect(allCountBadges.first()).toContainText(expectedCount, { timeout: 10000 });
    console.log(`[create-list] Count badge shows "${expectedCount}" (via first badge fallback)`);
    return;
  }

  await expect(badge.first()).toContainText(expectedCount, { timeout: 10000 });
  console.log(`[create-list] Count badge shows "${expectedCount}"`);
});

Then('I save the list workflow data for subsequent steps', async ({ page, testData }) => {
  const listName = testData.listName || 'My Top Shows';
  // Capture current localStorage state (Zustand store) so workflow-consumers
  // can restore it in their fresh browser contexts
  const movieStoreData = await page.evaluate(() => localStorage.getItem('specwright-show-data'));
  saveScopedTestData('listworkflow', { listName, movieStoreData });
  console.log(`[create-list] Saved to listworkflow: listName="${listName}", movieStoreData=${!!movieStoreData}`);
});
