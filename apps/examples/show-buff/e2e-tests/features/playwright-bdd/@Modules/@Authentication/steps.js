/**
 * Authentication module-specific steps.
 * Co-located with authentication.feature — scoped to @Modules AND @Authentication.
 *
 * Reusable steps (login, navigation, assertions) live in shared/.
 * Only module-specific steps that are NOT reusable belong here.
 */
import { When, Then, expect } from '../../../../playwright/fixtures.js';

When('I click the user menu button', async ({ page }) => {
  const userMenuButton = page.getByTestId('user-menu-button');
  await userMenuButton.waitFor({ state: 'visible', timeout: 10000 });
  await userMenuButton.click();
});

When('I click the logout button', async ({ page }) => {
  // Try data-testid first (apps that expose one), fall back to role+name
  const byTestId = page.getByTestId('logout-button');
  const hasByTestId = await byTestId.isVisible().catch(() => false);
  if (hasByTestId) {
    await byTestId.click();
  } else {
    await page.getByRole('button', { name: 'Logout' }).click();
  }
});

Then('the password field should be visible', async ({ page }) => {
  const passwordInput = page.getByTestId('loginPassword');
  await expect(passwordInput).toBeVisible();
});

Then('the Go Back button should be visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Go Back' })).toBeVisible();
});

Then('the Forgot Password button should be visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible();
});
