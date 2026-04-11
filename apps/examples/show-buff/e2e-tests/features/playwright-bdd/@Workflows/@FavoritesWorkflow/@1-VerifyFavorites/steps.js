/**
 * Favorites Workflow — @1-VerifyFavorites steps
 * Tags: @favoritesworkflow @1-VerifyFavorites @workflow-consumer
 *
 * Selectors (all data-testid, validated 2026-04-11):
 *   page-favorites     — favorites page container
 *   favorites-grid     — grid of favorited shows
 *   favorites-count    — count badge SPAN (integer, non-zero after precondition)
 *   show-card-{id}     — individual show card link (prefix pattern)
 *   show-card-title-{id} — show card title H3 (search by heading text in grid)
 *
 * Loads: loadScopedTestData('favoritesworkflow') → { showTitle }
 * Dependency: precondition project (playwright.config.ts) guarantees @0-Precondition runs first
 */
import { Given, When, Then, expect } from '../../../../../playwright/fixtures.js';
import { loadScopedTestData } from '../../../../../playwright/fixtures.js';

Given('I load predata from {string}', async ({ page, testData }, scope) => {
  const data = loadScopedTestData(scope);
  Object.assign(testData, data);
  console.log(`📦 Loaded predata from "${scope}": showTitle="${data.showTitle}", movieStoreData=${!!data.movieStoreData}`);
  if (!data.showTitle) {
    throw new Error(
      `Predata from "${scope}" is missing "showTitle" — did @0-Precondition run successfully?`,
    );
  }
  // Restore favorites localStorage state so FavoritesPage renders correctly in the
  // fresh browser context (which only has auth state, not the favorites written by precondition).
  if (data.movieStoreData) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: 'specwright-show-data', value: data.movieStoreData },
    );
    console.log(`🗄️ Restored specwright-show-data to localStorage for workflow consumer`);
  }
});

Then('the favorites page is loaded', async ({ page }) => {
  await expect(page).toHaveURL(/\/favorites/, { timeout: 15000 });
  await expect(page.getByTestId('page-favorites')).toBeVisible({ timeout: 10000 });
});

Then('the favorites grid is visible with show cards', async ({ page }) => {
  await expect(page.getByTestId('favorites-grid')).toBeVisible({ timeout: 10000 });
  const firstCard = page
    .getByTestId('favorites-grid')
    .locator('a[data-testid^="show-card-"]')
    .first();
  await expect(firstCard).toBeVisible({ timeout: 10000 });
});

Then('the favorited show appears in the grid with the correct title', async ({ page, testData }) => {
  const { showTitle } = testData;
  if (!showTitle) {
    throw new Error(
      'showTitle is missing from predata — check @0-Precondition saved data correctly',
    );
  }
  const titleEl = page
    .getByTestId('favorites-grid')
    .getByRole('heading', { name: showTitle, level: 3 });
  await expect(titleEl).toBeVisible({ timeout: 10000 });
  await expect(titleEl).toHaveText(showTitle);
});

Then('the favorites count badge shows a non-zero number', async ({ page }) => {
  const badge = page.getByTestId('favorites-count');
  await expect(badge).toBeVisible({ timeout: 10000 });
  const count = parseInt((await badge.textContent())?.trim() || '0', 10);
  expect(count).toBeGreaterThan(0);
});
