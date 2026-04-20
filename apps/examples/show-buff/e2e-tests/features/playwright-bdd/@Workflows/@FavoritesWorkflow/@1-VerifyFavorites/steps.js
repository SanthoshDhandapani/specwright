/**
 * Steps for @FavoritesWorkflow Phase 1 — Verify Favorites
 * Scoped to @Workflows/@FavoritesWorkflow/@1-VerifyFavorites/ via path-based scoping.
 *
 * Shared steps used here (from parent/shared scopes):
 *   - Given I am logged in                  → shared/auth.steps.js
 *   - Given I load predata from {string}    → shared/workflow.steps.js
 *   - When I navigate to {string}           → shared/navigation.steps.js
 *
 * Key selectors (confirmed via live browser exploration 2026-04-20):
 *   - Page container:    getByTestId('page-favorites')
 *   - Page heading:      getByRole('heading', { name: 'Favorites' })
 *   - Count badge:       getByTestId('favorites-count')  — <span> with integer text
 *   - Favorites grid:    getByTestId('favorites-grid')
 *   - Show card:         getByTestId('show-card-{id}')   — <a> in the grid
 *   - Show card title:   getByTestId('show-card-title-{id}') — <h3> inside card
 *
 * Predata keys loaded from 'favoritesworkflow' scope:
 *   - testData.showTitle  — e.g. "The Witcher"
 *   - testData.showId     — e.g. 28276
 */
import { Then, expect } from '../../../../../playwright/fixtures.js';

/**
 * Assert the /favorites page is fully rendered.
 */
Then('the favorites page should be displayed', async ({ page }) => {
  await expect(page.getByTestId('page-favorites')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible();
});

/**
 * Assert the show saved in @0-Precondition appears as a card in the favorites grid.
 * Uses testData.showId from predata to construct the dynamic testid.
 */
Then('the show from predata should appear in the favorites grid', async ({ page, testData }) => {
  await expect(page.getByTestId('favorites-grid')).toBeVisible();
  await expect(page.getByTestId(`show-card-${testData.showId}`)).toBeVisible();
});

/**
 * Assert the show card title in the favorites grid matches the saved show name.
 */
Then('the show title in the grid should match the saved show name', async ({ page, testData }) => {
  await expect(
    page.getByTestId(`show-card-title-${testData.showId}`)
  ).toHaveText(testData.showTitle);
});

/**
 * Assert the favorites count badge is visible on the page.
 */
Then('the favorites count badge should be visible', async ({ page }) => {
  await expect(page.getByTestId('favorites-count')).toBeVisible();
});

/**
 * Assert the favorites count badge shows a positive integer — relative assertion
 * so it is stable regardless of how many other shows are in the user's favorites.
 */
Then('the favorites count badge should show a positive number', async ({ page }) => {
  const countText = await page.getByTestId('favorites-count').textContent();
  const count = parseInt(countText || '0', 10);
  expect(count).toBeGreaterThan(0);
});
