/**
 * Authentication module steps — co-located with authentication.feature.
 * Scoped to @Modules AND @Authentication via playwright-bdd path-based scoping.
 *
 * Shared steps reused (defined in shared/, NOT redefined here):
 *   - Given I am on the sign-in page       → shared/auth.steps.js
 *   - Then I should be redirected to {str} → shared/auth.steps.js
 *
 * Validated selectors (live exploration 2026-04-20):
 *   page-signin  → main sign-in page wrapper
 *   input-email  → email input (type=email), single-step form
 *   input-password → password input (type=password)
 *   btn-signin   → Sign In submit button
 *   error-signin → error alert (role=alert), shown on invalid credentials
 *   page-todos   → todos page main wrapper (post-login)
 *   btn-logout   → logout button in page header on /todos
 */
import { Given, When, Then, expect } from '../../../../playwright/fixtures.js';

// ─── Sign-in page element assertions ───────────────────────────────────────

Then('the sign-in form should be visible', async ({ page }) => {
  await expect(page.getByTestId('page-signin')).toBeVisible();
});

Then('the email input should be visible', async ({ page }) => {
  await expect(page.getByTestId('input-email')).toBeVisible();
});

Then('the password input should be visible', async ({ page }) => {
  await expect(page.getByTestId('input-password')).toBeVisible();
});

Then('the sign-in button should be visible', async ({ page }) => {
  await expect(page.getByTestId('btn-signin')).toBeVisible();
});

// ─── Valid login ────────────────────────────────────────────────────────────

When('I sign in with valid credentials', async ({ page, authData }) => {
  await page.getByTestId('input-email').fill(authData.validCredentials.email);
  await page.getByTestId('input-password').fill(authData.validCredentials.password);
  await page.getByTestId('btn-signin').click();
});

Then('the todos page should be visible', async ({ page }) => {
  await expect(page.getByTestId('page-todos')).toBeVisible();
});

// ─── Form field interaction ─────────────────────────────────────────────────

When('I enter {string} as the email address', async ({ page }, email) => {
  await page.getByTestId('input-email').fill(email);
});

When('I enter {string} as the password', async ({ page }, password) => {
  await page.getByTestId('input-password').fill(password);
});

When('I enter my registered email address', async ({ page, authData }) => {
  await page.getByTestId('input-email').fill(authData.validCredentials.email);
});

When('I submit the sign-in form', async ({ page }) => {
  await page.getByTestId('btn-signin').click();
});

// ─── Error state assertions ─────────────────────────────────────────────────

Then('a sign-in error alert should be visible', async ({ page }) => {
  await expect(page.getByTestId('error-signin')).toBeVisible();
});

Then('I should remain on the sign-in page', async ({ page }) => {
  await expect(page).toHaveURL(/\/signin/);
});

// ─── Logout flow ────────────────────────────────────────────────────────────

Given('I am signed in to the todo app', async ({ page, authData }) => {
  await page.getByTestId('input-email').fill(authData.validCredentials.email);
  await page.getByTestId('input-password').fill(authData.validCredentials.password);
  await page.getByTestId('btn-signin').click();
  await expect(page).toHaveURL(/\/todos/);
  await expect(page.getByTestId('page-todos')).toBeVisible();
});

When('I click the logout button', async ({ page }) => {
  await page.getByTestId('btn-logout').click();
});
