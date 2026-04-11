/**
 * Home Page step definitions — @HomePage @Modules
 * Co-located with homepage.feature.
 *
 * Auth: OAuth localStorage injection (storageState from auth.setup).
 * Shared steps (navigation, assertions) live in shared/ and are auto-loaded.
 *
 * Selectors reference (all data-testid validated 2026-04-11):
 *   header, header-logo, header-nav-home, header-nav-favorites,
 *   header-nav-watchlist, header-nav-lists, user-menu-trigger,
 *   user-avatar, user-display-name, page-home, year-pagination,
 *   year-tab-{2026|2025|2024|2023}, page-prev, page-indicator,
 *   page-next, show-grid, show-card-{id} (dynamic — use prefix selector)
 *   footer — no testId, use locator('footer')
 *   TVMaze link — getByRole('link', { name: 'TVMaze' })
 *
 * NOTE: "My Lists" — nav label renders as "My Lists" (not "Lists").
 * NOTE: year 2026 has 1 page (pagination disabled); use 2024 for pagination tests.
 */
import { Given, When, Then, expect } from '../../../../playwright/fixtures.js';

// ─── Given ──────────────────────────────────────────────────────────────────

/**
 * Navigate to the home page.
 * Auth is pre-loaded via storageState from auth.setup (OAuth localStorage strategy).
 */
Given('I am on the home page', async ({ page, testConfig }) => {
  await page.goto(testConfig.routes.Home);
  await page.waitForLoadState('networkidle', { timeout: testConfig.timeouts.loadState });
  // Confirm auth is active — user menu trigger must be visible
  await expect(page.getByTestId('user-menu-trigger')).toBeVisible({ timeout: testConfig.timeouts.element });
});

// ─── Then: Page Structure ────────────────────────────────────────────────────

Then('the header is visible', async ({ page }) => {
  await expect(page.getByTestId('header')).toBeVisible();
  await expect(page.getByTestId('header-logo')).toBeVisible();
});

Then('the year pagination tabs are visible', async ({ page }) => {
  await expect(page.getByTestId('year-pagination')).toBeVisible();
});

Then('the show grid is visible', async ({ page }) => {
  await expect(page.getByTestId('show-grid')).toBeVisible();
});

Then('the footer is visible with TVMaze attribution', async ({ page }) => {
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.getByRole('link', { name: 'TVMaze' })).toBeVisible();
});

// ─── Then: Navigation Links ──────────────────────────────────────────────────

Then(
  'the nav link {string} has href {string} and text {string}',
  async ({ page }, testId, expectedHref, expectedText) => {
    const link = page.getByTestId(testId);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', expectedHref);
    await expect(link).toHaveText(expectedText);
  },
);

// ─── When: User Menu ─────────────────────────────────────────────────────────

When('I click the user menu trigger', async ({ page }) => {
  await page.getByTestId('user-menu-trigger').click();
});

Then('the sign-out button is visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
});

Then('the sign-out button is not visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Sign Out' })).not.toBeVisible();
});

// ─── Then: Year Tabs ─────────────────────────────────────────────────────────

Then('there are {int} year tabs displayed', async ({ page }, count) => {
  const tabs = page.getByTestId('year-pagination').locator('button');
  await expect(tabs).toHaveCount(count);
});

Then('the year tab {string} is active with brand-600 styling', async ({ page }, testId) => {
  const tab = page.getByTestId(testId);
  await expect(tab).toBeVisible();
  await expect(tab).toHaveClass(/bg-brand-600/);
});

Then('the year tab {string} is inactive with gray styling', async ({ page }, testId) => {
  const tab = page.getByTestId(testId);
  await expect(tab).toBeVisible();
  await expect(tab).toHaveClass(/bg-gray-800/);
});

// ─── When: Year Tabs ─────────────────────────────────────────────────────────

When('I click the year tab {string}', async ({ page }, testId) => {
  await page.getByTestId(testId).click();
  // Wait for the show grid to settle after tab switch
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

// ─── Then: Pagination ────────────────────────────────────────────────────────

Then('the page indicator shows {string}', async ({ page }, text) => {
  await expect(page.getByTestId('page-indicator')).toHaveText(text);
});

Then('the prev page button is disabled', async ({ page }) => {
  await expect(page.getByTestId('page-prev')).toBeDisabled();
});

Then('the prev page button is enabled', async ({ page }) => {
  await expect(page.getByTestId('page-prev')).toBeEnabled();
});

Then('the next page button is enabled', async ({ page }) => {
  await expect(page.getByTestId('page-next')).toBeEnabled();
});

Then('the next page button is disabled', async ({ page }) => {
  await expect(page.getByTestId('page-next')).toBeDisabled();
});

// ─── When: Pagination ────────────────────────────────────────────────────────

When('I click the next page button', async ({ page }) => {
  await page.getByTestId('page-next').click();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

When('I click the prev page button', async ({ page }) => {
  await page.getByTestId('page-prev').click();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

// ─── When / Then: Show Cards ─────────────────────────────────────────────────

When('I click the first show card', async ({ page }) => {
  const firstCard = page.getByTestId('show-grid').locator('a[data-testid^="show-card-"]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
});

Then('I am navigated to a show detail page', async ({ page }) => {
  await expect(page).toHaveURL(/\/show\/\d+/);
});

// ─── Then: Footer ────────────────────────────────────────────────────────────

Then('the TVMaze link has href {string}', async ({ page }, href) => {
  const link = page.getByRole('link', { name: 'TVMaze' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', href);
});

Then('the TVMaze link opens in a new tab', async ({ page }) => {
  const link = page.getByRole('link', { name: 'TVMaze' });
  await expect(link).toHaveAttribute('target', '_blank');
});
