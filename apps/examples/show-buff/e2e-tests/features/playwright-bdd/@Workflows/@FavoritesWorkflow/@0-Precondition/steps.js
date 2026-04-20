/**
 * Steps for @FavoritesWorkflow Phase 0 — Add Show to Favorites
 * Scoped to @Workflows/@FavoritesWorkflow/@0-Precondition/ via path-based scoping.
 *
 * Shared steps used here (from parent/shared scopes):
 *   - Given I am logged in              → shared/auth.steps.js
 *   - When I navigate to {string}       → shared/navigation.steps.js
 *
 * Key selectors (confirmed via live browser exploration 2026-04-20):
 *   - Show card on home:    getByTestId('show-card-{id}') — <a> link, data-testid="show-card-28276" for The Witcher
 *   - Page container:       getByTestId('page-show-detail')
 *   - Show title (h1):      getByTestId('show-title')
 *   - Add to favorites:     getByTestId('btn-add-favorite')   — visible when NOT in favorites
 *   - Remove from favorites:getByTestId('btn-remove-favorite')— visible when IN favorites ([active] state)
 */
import {
  When,
  Then,
  Before,
  expect,
  saveScopedTestData,
  loadScopedTestData,
} from '../../../../../playwright/fixtures.js';

/**
 * Before each scenario in this file: restore the favorites localStorage state if it was
 * previously saved by the @prerequisite scenario. This keeps the fresh browser context
 * (from storageState — auth only) aware of favorites added in Scenario 1.
 *
 * Safe for @prerequisite: loadScopedTestData returns null on its first run (file doesn't
 * exist yet), so the guard below short-circuits and Scenario 1 always starts clean.
 */
Before(async ({ page }) => {
  const data = loadScopedTestData('favoritesworkflow');
  if (data?.localStorage && Object.keys(data.localStorage).length > 0) {
    await page.addInitScript(({ snap }) => {
      for (const [key, value] of Object.entries(snap)) {
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
    }, { snap: data.localStorage });
  }
});

/**
 * Click a show card on the home page by show title.
 * Uses h3 heading → ancestor <a> pattern (same as @ListWorkflow convention).
 */
When('I click on the show card for {string}', async ({ page }, showName) => {
  await page
    .getByRole('heading', { name: showName, level: 3 })
    .locator('xpath=ancestor::a')
    .first()
    .click();
  await page.waitForLoadState('networkidle');
});

/**
 * Verify the show detail page is displayed with the expected title.
 */
Then('the show detail page should display {string}', async ({ page }, expectedTitle) => {
  await expect(page.getByTestId('page-show-detail')).toBeVisible();
  await expect(page.getByTestId('show-title')).toHaveText(expectedTitle);
});

/**
 * Add the show to favorites — idempotent: skips the click if already favorited.
 * Always asserts btn-remove-favorite is visible as the final state.
 */
When('I add the show to favorites', async ({ page }) => {
  const alreadyFavorited = await page
    .getByTestId('btn-remove-favorite')
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (!alreadyFavorited) {
    await page.getByTestId('btn-add-favorite').click();
  }

  // Confirmation: button toggles to "♥ Remove from Favorites"
  await expect(page.getByTestId('btn-remove-favorite')).toBeVisible();
});

/**
 * Assert the show is currently marked as favorited (btn-remove-favorite visible).
 */
Then('the show should be marked as favorited', async ({ page }) => {
  await expect(page.getByTestId('btn-remove-favorite')).toBeVisible();
});

/**
 * Assert the "Add to Favorites" button is not visible (show is already in favorites).
 */
Then('the add to favorites button should not be visible', async ({ page }) => {
  await expect(page.getByTestId('btn-add-favorite')).not.toBeVisible();
});

/**
 * Save the current show's title and ID as shared test data for @1-VerifyFavorites.
 * Reads the show title from the page and the show ID from the URL.
 */
Then('I save the show data as shared test data', async ({ page }) => {
  const showTitle = (await page.getByTestId('show-title').textContent())?.trim();
  const urlMatch = page.url().match(/\/show\/(\d+)/);
  const showId = urlMatch ? parseInt(urlMatch[1], 10) : null;

  // Snapshot the Zustand-persisted store so subsequent scenarios in this file can
  // restore it via addInitScript (favorites are localStorage-only — not server-side).
  const showData = await page.evaluate(() => {
    const raw = localStorage.getItem('specwright-show-data');
    return raw ? JSON.parse(raw) : null;
  });

  saveScopedTestData('favoritesworkflow', {
    showTitle,
    showId,
    ...(showData ? { localStorage: { 'specwright-show-data': showData } } : {}),
  });
});
