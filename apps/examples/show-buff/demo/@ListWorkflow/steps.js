/**
 * List Workflow — shared step definitions for all phases.
 * Lives at @Workflows/@ListWorkflow/steps.js — scoped to all features tagged
 * @Workflows AND @ListWorkflow (i.e. every phase @0-*, @1-*, @2-*).
 *
 * Any step that more than one phase needs lives here. Phase-specific steps
 * go in the co-located @{N}-Phase/steps.js file instead.
 *
 * Shared steps used here (defined in shared/):
 *   - "I am logged in"                           (auth.steps.js)
 *   - "I navigate to {string}"                   (navigation.steps.js)
 *   - "I load predata from {string}"             (workflow.steps.js)
 *   - "the element with test ID {string} should be visible"  (navigation.steps.js)
 *   - "I should see the text {string}"           (navigation.steps.js)
 */
import { When, Then, expect } from '../../../../playwright/fixtures.js';

// ---------------------------------------------------------------------------
// Reusable locators (page-scoped — no cross-scenario caching)
// ---------------------------------------------------------------------------

/**
 * Returns a Locator for a list card link (the <a> wrapper), filtered by
 * the visible list name. Excludes inner name/count elements that share the
 * "list-card-" testId prefix.
 */
function listCardLinkByName(page, listName) {
  return page
    .locator(
      '[data-testid^="list-card-"]:not([data-testid*="name"]):not([data-testid*="count"])',
    )
    .filter({ hasText: listName });
}

function listCardNameByText(page, listName) {
  return page.locator('[data-testid^="list-card-name-"]').filter({ hasText: listName });
}

function listCardCountByName(page, listName) {
  // Navigate from the matching name to its sibling count badge via the parent card.
  const nameLocator = listCardNameByText(page, listName);
  return nameLocator
    .locator('xpath=ancestor::a[1]')
    .locator('[data-testid^="list-card-count-"]');
}

function addToListOptionByText(page, listName) {
  return page
    .locator('[data-testid^="add-to-list-option-"]')
    .filter({ hasText: listName });
}

// ---------------------------------------------------------------------------
// List creation + navigation
// ---------------------------------------------------------------------------

When('I create a custom list named {string}', async ({ page }, listName) => {
  const input = page.getByTestId('create-list-input');
  await expect(input).toBeVisible();
  await input.fill(listName);
  await page.getByTestId('create-list-submit').click();
});

When('I submit the create list form with an empty name', async ({ page }) => {
  const input = page.getByTestId('create-list-input');
  await expect(input).toBeVisible();
  await input.fill('');
  await page.getByTestId('create-list-submit').click();
});

When('I open the list card for {string}', async ({ page }, listName) => {
  const card = listCardLinkByName(page, listName);
  await expect(card.first()).toBeVisible();
  await card.first().click();
});

// ---------------------------------------------------------------------------
// List grid assertions
// ---------------------------------------------------------------------------

Then('the list card for {string} should be visible', async ({ page }, listName) => {
  await expect(listCardNameByText(page, listName).first()).toBeVisible();
});

Then(
  'the list card for {string} should not be visible',
  async ({ page }, listName) => {
    await expect(listCardNameByText(page, listName)).toHaveCount(0);
  },
);

Then(
  'the list card for {string} should display a show count badge',
  async ({ page }, listName) => {
    const countBadge = listCardCountByName(page, listName);
    await expect(countBadge.first()).toBeVisible();
    await expect(countBadge.first()).toContainText(/show/);
  },
);

Then('the lists empty state or grid should be present', async ({ page }) => {
  // Either the grid is visible (lists exist) or the empty state is visible (none).
  const gridCount = await page.getByTestId('lists-grid').count();
  if (gridCount > 0) {
    await expect(page.getByTestId('lists-grid')).toBeVisible();
  } else {
    await expect(page.getByTestId('lists-empty-state')).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// List detail page
// ---------------------------------------------------------------------------

Then('the list detail heading should contain {string}', async ({ page }, text) => {
  await expect(page.getByTestId('rename-list-display')).toContainText(text);
});

Then('the list detail count badge should be visible', async ({ page }) => {
  await expect(page.locator('span.rounded-full.bg-brand-600').first()).toBeVisible();
});

Then('the URL should match the list detail pattern', async ({ page }) => {
  await expect(page).toHaveURL(/\/lists\/[0-9a-f-]{36}/);
});

Then('the URL should end with {string}', async ({ page }, suffix) => {
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(page).toHaveURL(new RegExp(`${escaped}$`));
});

// ---------------------------------------------------------------------------
// Add to List dropdown (used on /show/{id})
// ---------------------------------------------------------------------------

When('I open the Add to List dropdown', async ({ page }) => {
  await page.getByTestId('add-to-list-trigger').click();
  await expect(page.getByTestId('add-to-list-menu')).toBeVisible();
});

When('I close the Add to List dropdown', async ({ page }) => {
  await page.getByTestId('add-to-list-trigger').click();
});

When(
  'I add the current show to the list {string}',
  async ({ page }, listName) => {
    await page.getByTestId('add-to-list-trigger').click();
    await expect(page.getByTestId('add-to-list-menu')).toBeVisible();

    const option = addToListOptionByText(page, listName);
    await expect(option.first()).toBeVisible();
    await option.first().click();
  },
);

Then(
  'the {string} option in the Add to List menu should be marked as added',
  async ({ page }, listName) => {
    await expect(addToListOptionByText(page, listName).first()).toContainText('✓');
  },
);

Then('the Add to List menu should show at least one list option', async ({ page }) => {
  const options = page.locator('[data-testid^="add-to-list-option-"]');
  await expect(options.first()).toBeVisible();
});
