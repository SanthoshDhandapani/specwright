/**
 * Shared list steps — cross-phase steps needed by multiple @ListWorkflow phases.
 * Lives in shared/ (no @-prefix) so it is globally scoped.
 *
 * Moved here from @Workflows/@ListWorkflow/@0-CreateList/steps.js because
 * path-based tag scoping in playwright-bdd v8+ made those steps invisible to
 * @1-AddShows and @2-VerifyList phases.
 *
 * Selectors (all data-testid):
 *   lists-grid              — grid container for list cards
 *   list-card-{uuid}        — dynamic list card link (prefix pattern)
 *   list-card-name-{uuid}   — list card name H3 (prefix pattern)
 *   page-list-detail        — list detail page main container
 *   rename-list-display     — list name H1 on detail page
 */
import { When, Then, expect } from '../../../playwright/fixtures.js';

When('I click the {string} list card', async ({ page }, listName) => {
  const grid = page.getByTestId('lists-grid');
  // Click the link card that contains the matching list name heading
  const card = grid.locator(`a[data-testid^="list-card-"]`).filter({
    has: page.locator(`[data-testid^="list-card-name-"]`, { hasText: listName }),
  });
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

Then('I am on the list detail page for {string}', async ({ page, testData }, listName) => {
  await expect(page).toHaveURL(/\/lists\/[a-f0-9-]{36}/, { timeout: 15000 });
  await expect(page.getByTestId('page-list-detail')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('rename-list-display')).toHaveText(listName, { timeout: 10000 });
  // Capture the list ID from the URL for later use
  const url = page.url();
  const match = url.match(/\/lists\/([a-f0-9-]{36})/);
  if (match) {
    testData.listId = match[1];
    console.log(`[list-detail] listId captured: ${testData.listId}`);
  }
});
