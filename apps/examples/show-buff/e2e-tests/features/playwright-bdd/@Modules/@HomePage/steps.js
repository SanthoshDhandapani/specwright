/**
 * Home Page — module-specific step definitions.
 * Co-located with homepage.feature — scoped to @Modules AND @HomePage.
 *
 * Shared steps (auth, navigation, element visibility, URL assertions)
 * live in shared/ and are globally available — only HomePage-specific
 * steps that are NOT reusable belong here.
 */
import { When, Then, expect } from '../../../../playwright/fixtures.js';

// ---------------------------------------------------------------------------
// Show Grid
// ---------------------------------------------------------------------------

Then('the show grid should contain at least one show card', async ({ page }) => {
  const firstCard = page
    .locator('[data-testid^="show-card-"]:not([data-testid*="poster"]):not([data-testid*="title"]):not([data-testid*="rating"])')
    .first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
});

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

Then('the footer should be visible with the TVMaze attribution link', async ({ page }) => {
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.locator('a[href="https://www.tvmaze.com/"]')).toBeVisible();
});

Then('the TVMaze attribution link should be visible in the footer', async ({ page }) => {
  await expect(page.locator('a[href="https://www.tvmaze.com/"]')).toBeVisible();
});

Then('the TVMaze attribution link should open in a new tab', async ({ page }) => {
  await expect(page.locator('a[href="https://www.tvmaze.com/"]')).toHaveAttribute('target', '_blank');
});

// ---------------------------------------------------------------------------
// Navigation Links
// ---------------------------------------------------------------------------

Then('the navigation link {string} should have href {string}', async ({ page }, testId, href) => {
  await expect(page.getByTestId(testId)).toHaveAttribute('href', href);
});

// ---------------------------------------------------------------------------
// User Menu
// ---------------------------------------------------------------------------

When('I click the user menu trigger', async ({ page }) => {
  await page.getByTestId('user-menu-trigger').click();
});

Then('the user menu dropdown should be visible', async ({ page }) => {
  await expect(page.getByTestId('user-menu-dropdown')).toBeVisible();
});

Then('the user menu dropdown should not be visible', async ({ page }) => {
  await expect(page.getByTestId('user-menu-dropdown')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Year Tabs
// ---------------------------------------------------------------------------

Then('the active year tab should have brand-600 styling', async ({ page }) => {
  // At least one year tab must carry the bg-brand-600 class (the currently selected one)
  const activeTab = page.locator('[data-testid^="year-tab-"].bg-brand-600');
  await expect(activeTab.first()).toBeVisible();
});

Then('the inactive year tabs should have gray styling', async ({ page }) => {
  // At least one tab that is NOT active should carry the bg-gray-800 class
  const inactiveTab = page.locator('[data-testid^="year-tab-"].bg-gray-800');
  await expect(inactiveTab.first()).toBeVisible();
});

Then('the year tab {string} should be active', async ({ page }, year) => {
  const tab = page.getByTestId(`year-tab-${year}`);
  await expect(tab).toHaveClass(/bg-brand-600/);
});

Then('the year tab {string} should not be active', async ({ page }, year) => {
  const tab = page.getByTestId(`year-tab-${year}`);
  await expect(tab).not.toHaveClass(/bg-brand-600/);
});

// ---------------------------------------------------------------------------
// Show Card Navigation
// ---------------------------------------------------------------------------

When('I click the first show card', async ({ page }) => {
  const firstCard = page
    .locator('[data-testid^="show-card-"]:not([data-testid*="poster"]):not([data-testid*="title"]):not([data-testid*="rating"])')
    .first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
  await firstCard.click();
});
