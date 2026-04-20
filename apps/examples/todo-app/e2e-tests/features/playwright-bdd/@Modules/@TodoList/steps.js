import { When, Then, expect } from '../../../../playwright/fixtures.js';

// ---------------------------------------------------------------------------
// @Modules/@TodoList/steps.js
// Module-scoped steps for the /todos page.
// Shared steps used here (from shared/):
//   - Given I am authenticated          → auth.steps.js
//   - When I navigate to "{pageName}"   → navigation.steps.js
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Visibility / structural assertions
// ---------------------------------------------------------------------------

Then('I should see the todos page container', async ({ page }) => {
  await expect(page.getByTestId('page-todos')).toBeVisible();
});

Then('I should see the {string} heading', async ({ page }, headingText) => {
  await expect(page.getByRole('heading', { name: headingText, level: 1 })).toBeVisible();
});

Then('I should see the {string} button', async ({ page }, buttonName) => {
  if (buttonName === 'New Todo') {
    await expect(page.getByTestId('btn-create-todo')).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: buttonName })).toBeVisible();
  }
});

Then('I should see the All, Active, and Completed filter tabs', async ({ page }) => {
  await expect(page.getByTestId('filter-tab-all')).toBeVisible();
  await expect(page.getByTestId('filter-tab-active')).toBeVisible();
  await expect(page.getByTestId('filter-tab-completed')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Empty state assertions
// ---------------------------------------------------------------------------

Then('I should see the empty state container', async ({ page }) => {
  await expect(page.getByTestId('todos-empty-state')).toBeVisible();
});

Then('I should see the empty state heading {string}', async ({ page }, headingText) => {
  await expect(page.getByRole('heading', { name: headingText, level: 6 })).toBeVisible();
});

Then('I should see the empty state message {string}', async ({ page }, message) => {
  await expect(page.getByText(message)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Filter tab selection assertions
// ---------------------------------------------------------------------------

Then('the All filter tab should be selected', async ({ page }) => {
  await expect(page.getByTestId('filter-tab-all')).toHaveAttribute('aria-selected', 'true');
});

Then('the Active filter tab should be selected', async ({ page }) => {
  await expect(page.getByTestId('filter-tab-active')).toHaveAttribute('aria-selected', 'true');
});

Then('the Completed filter tab should be selected', async ({ page }) => {
  await expect(page.getByTestId('filter-tab-completed')).toHaveAttribute('aria-selected', 'true');
});

// ---------------------------------------------------------------------------
// Filter tab click actions
// ---------------------------------------------------------------------------

When('I click the Active filter tab', async ({ page }) => {
  await page.getByTestId('filter-tab-active').click();
});

When('I click the Completed filter tab', async ({ page }) => {
  await page.getByTestId('filter-tab-completed').click();
});

// ---------------------------------------------------------------------------
// Navigation button actions
// ---------------------------------------------------------------------------

When('I click the {string} button', async ({ page }, buttonName) => {
  if (buttonName === 'New Todo') {
    await page.getByTestId('btn-create-todo').click();
  } else {
    await page.getByRole('button', { name: buttonName }).click();
  }
});

When('I click the Logout button', async ({ page }) => {
  await page.getByTestId('btn-logout').click();
});

// ---------------------------------------------------------------------------
// URL assertions
// ---------------------------------------------------------------------------

Then('the URL should change to {string}', async ({ page }, path) => {
  await expect(page).toHaveURL(new RegExp(`${path}$`));
});
