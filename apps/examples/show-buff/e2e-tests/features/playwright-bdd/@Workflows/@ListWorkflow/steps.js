/**
 * Workflow-level shared steps for @ListWorkflow.
 * Scoped to ALL features under @Workflows/@ListWorkflow/ via path-based scoping.
 *
 * Used by:
 *   @0-CreateList — I click the list card for {string}, list detail heading assertion
 *   @2-VerifyList — I click the created list card, list detail heading from predata
 */
import { When, Then, expect } from '../../../../playwright/fixtures.js';

/**
 * Click a list card by its heading name (parameterised — used by @0-CreateList).
 * Finds the H3 heading with the given name, then navigates via its ancestor anchor.
 */
When('I click the list card for {string}', async ({ page }, listName) => {
  await page.getByRole('heading', { name: listName, level: 3 })
    .locator('xpath=ancestor::a')
    .first()
    .click();
  await page.waitForLoadState('networkidle');
});

/**
 * Click the list card identified by testData.listName from predata (used by @2-VerifyList).
 */
When('I click the created list card', async ({ page, testData }) => {
  await page.getByRole('heading', { name: testData.listName, level: 3 })
    .locator('xpath=ancestor::a')
    .first()
    .click();
  await page.waitForLoadState('networkidle');
});

/**
 * Verify list detail page heading matches a hardcoded string (used by @0-CreateList).
 */
Then('the list detail page should show heading {string}', async ({ page }, expectedName) => {
  await expect(page.getByTestId('page-list-detail')).toBeVisible();
  await expect(page.getByTestId('rename-list-display')).toHaveText(expectedName);
});

/**
 * Verify list detail page heading matches testData.listName from predata (used by @2-VerifyList).
 */
Then('the list detail page should show the created list heading', async ({ page, testData }) => {
  await expect(page.getByTestId('page-list-detail')).toBeVisible();
  await expect(page.getByTestId('rename-list-display')).toHaveText(testData.listName);
});
