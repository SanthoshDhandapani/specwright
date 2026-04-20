/**
 * Steps for @ListWorkflow Phase 0 — Create List
 * Scoped to @Workflows/@ListWorkflow/@0-CreateList/ via path-based scoping.
 *
 * Shared steps used here (from parent scopes):
 *   - Given I am logged in              → shared/auth.steps.js
 *   - When I navigate to {string}       → shared/navigation.steps.js
 *   - When I click the list card for {string}                  → @ListWorkflow/steps.js
 *   - Then the list detail page should show heading {string}   → @ListWorkflow/steps.js
 */
import { When, Then, expect, saveScopedTestData } from '../../../../../playwright/fixtures.js';

When('I create a new list named {string}', async ({ page }, listName) => {
  await page.getByTestId('create-list-input').fill(listName);
  await page.getByTestId('create-list-submit').click();
  await page.waitForLoadState('networkidle');
});

Then('the new list card should appear for {string}', async ({ page }, listName) => {
  await expect(
    page.getByTestId('lists-grid').getByRole('heading', { name: listName })
  ).toBeVisible();
});

Then('the page URL should contain a list UUID', async ({ page }) => {
  await expect(page).toHaveURL(/\/lists\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
});

Then('I save the list data as shared test data', async ({ page }) => {
  const url = page.url();
  const match = url.match(/\/lists\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
  const listId = match ? match[1] : null;
  const listName = await page.getByTestId('rename-list-display').innerText();
  // Snapshot the Zustand store from localStorage so consumer phases have the list available.
  // Without this, fresh browser contexts start with empty lists and the Add-to-List dropdown is empty.
  const showData = await page.evaluate(() => {
    const raw = localStorage.getItem('specwright-show-data');
    return raw ? JSON.parse(raw) : null;
  });
  saveScopedTestData('listworkflow', {
    listId,
    listName,
    localStorage: { 'specwright-show-data': showData },
  });
});
