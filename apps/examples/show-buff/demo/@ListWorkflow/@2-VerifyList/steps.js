/**
 * List Workflow — Phase 2 (@2-VerifyList) step definitions.
 * Scoped to features matching @Workflows AND @ListWorkflow AND @2-VerifyList.
 *
 * Phase 2 is the TERMINAL CONSUMER phase: it reads predata (localStorage snapshot)
 * written by Phase 1 and verifies list contents, rename, delete, and remove-show
 * operations. No After hook is needed — Phase 2 writes no downstream data.
 *
 * Shared steps used here (defined elsewhere):
 *   - "I am logged in"                                        (shared/auth.steps.js)
 *   - "I navigate to {string}"                                (shared/navigation.steps.js)
 *   - "I load predata from {string}"                          (shared/workflow.steps.js)
 *   - "the element with test ID {string} should be visible"   (shared/navigation.steps.js)
 *   - "the URL should end with {string}"                      (@ListWorkflow/steps.js)
 *   - "I create a custom list named {string}"                 (@ListWorkflow/steps.js)
 *   - "I open the list card for {string}"                     (@ListWorkflow/steps.js)
 *   - "the list card for {string} should be visible"          (@ListWorkflow/steps.js)
 *   - "the list card for {string} should not be visible"      (@ListWorkflow/steps.js)
 *   - "the list card for {string} should display a show count badge" (@ListWorkflow/steps.js)
 *   - "the list detail heading should contain {string}"       (@ListWorkflow/steps.js)
 *   - "the list detail count badge should be visible"         (@ListWorkflow/steps.js)
 */
import { When, Then, expect } from '../../../../../playwright/fixtures.js';

// ---------------------------------------------------------------------------
// Rename list — inline input interaction
// ---------------------------------------------------------------------------

When('I click the list name heading to start renaming', async ({ page }) => {
  const heading = page.getByTestId('rename-list-display');
  await expect(heading).toBeVisible();
  await heading.click();
});

When(
  'I rename the list to {string} and press Enter',
  async ({ page }, newName) => {
    const input = page.getByTestId('rename-list-input');
    await expect(input).toBeVisible();
    await input.fill(newName);
    await input.press('Enter');
  },
);

// ---------------------------------------------------------------------------
// Delete list
// ---------------------------------------------------------------------------

When('I click the delete list button', async ({ page }) => {
  const btn = page.getByTestId('btn-delete-list');
  await expect(btn).toBeVisible();
  await btn.click();
});

// ---------------------------------------------------------------------------
// Count badge — capture & diff
// ---------------------------------------------------------------------------

When(
  'I capture the list detail count badge text as {string}',
  async ({ page, scenarioContext }, alias) => {
    const badge = page.locator('span.rounded-full.bg-brand-600').first();
    await expect(badge).toBeVisible();
    const text = (await badge.textContent())?.trim() || '';
    scenarioContext[alias] = text;
  },
);

When('I click the first remove-show button', async ({ page }) => {
  const removeBtn = page.locator('[data-testid^="remove-show-"]').first();
  await expect(removeBtn).toBeVisible();
  await removeBtn.click();
});

Then(
  'the list detail count badge text should differ from {string}',
  async ({ page, scenarioContext }, alias) => {
    const before = scenarioContext[alias];
    expect(before, `Expected "${alias}" to be captured before removal`).toBeTruthy();

    // Wait for the badge to update then assert it differs from the captured value
    const badge = page.locator('span.rounded-full.bg-brand-600').first();
    await expect(badge).toBeVisible();
    await expect(badge).not.toHaveText(before);
  },
);
