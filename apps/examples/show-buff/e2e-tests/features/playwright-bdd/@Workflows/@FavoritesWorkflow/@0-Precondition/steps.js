/**
 * Favorites Workflow — @0-Precondition steps
 * Tags: @favoritesworkflow @0-Precondition @precondition @cross-feature-data @serial-execution
 *
 * Selectors (all data-testid, validated 2026-04-11):
 *   page-home         — home page container
 *   show-grid         — show cards grid
 *   show-card-{id}    — individual show card link (dynamic prefix pattern)
 *   page-show-detail  — show detail page container
 *   show-title        — show title H1 on detail page
 *   btn-add-favorite  — Add to Favorites BUTTON (before adding)
 *   btn-remove-favorite — Remove from Favorites BUTTON (after adding — state toggle IS the confirmation)
 *
 * Saves: saveScopedTestData('favoritesworkflow', { showTitle })
 */
import { Given, When, Then, expect } from '../../../../../playwright/fixtures.js';
import { saveScopedTestData } from '../../../../../playwright/fixtures.js';

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

Then('I capture the show title from the detail page', async ({ page, testData }) => {
  const titleEl = page.getByTestId('show-title');
  await expect(titleEl).toBeVisible({ timeout: 10000 });
  testData.showTitle = (await titleEl.textContent())?.trim() ?? '';
  console.log(`📺 Captured show title: "${testData.showTitle}"`);
});

When('I click the Add to Favorites button', async ({ page }) => {
  const btn = page.getByTestId('btn-add-favorite');
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
});

Then('the button changes to Remove from Favorites confirming it was added', async ({ page }) => {
  // No toast — button toggle from btn-add-favorite → btn-remove-favorite IS the confirmation
  await expect(page.getByTestId('btn-remove-favorite')).toBeVisible({ timeout: 10000 });
});

Then('I save the favorited show data for workflow verification', async ({ page, testData }) => {
  const showTitle =
    testData.showTitle?.trim() ||
    (await page.getByTestId('show-title').textContent())?.trim() ||
    '';
  // Capture the favorites localStorage state so workflow-consumers can restore it
  // in their new browser context (created from auth-only storageState).
  const movieStoreData = await page.evaluate(() => localStorage.getItem('specwright-show-data'));
  saveScopedTestData('favoritesworkflow', { showTitle, movieStoreData });
  console.log(`💾 Saved to favoritesworkflow: showTitle="${showTitle}", movieStoreData=${!!movieStoreData}`);
});
