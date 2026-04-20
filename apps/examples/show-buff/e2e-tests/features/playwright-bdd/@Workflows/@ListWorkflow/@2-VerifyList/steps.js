/**
 * Steps for @ListWorkflow Phase 2 — Verify List Contents
 * Scoped to @Workflows/@ListWorkflow/@2-VerifyList/ via path-based scoping.
 *
 * Shared steps used here (from parent scopes):
 *   - Given I am logged in                  → shared/auth.steps.js
 *   - When I navigate to {string}           → shared/navigation.steps.js
 *   - Given I load predata from {string}    → shared/workflow.steps.js
 *   - When I click the created list card                           → @ListWorkflow/steps.js
 *   - Then the list detail page should show the created list heading → @ListWorkflow/steps.js
 *
 * Data flow:
 *   Loads: listId, listName, show1Name, show2Name from scope "listworkflow" (written by Phases 0 & 1)
 */
import { Then, expect } from '../../../../../playwright/fixtures.js';

Then('the list card for the created list should be visible', async ({ page, testData }) => {
  await expect(page.getByTestId(`list-card-${testData.listId}`)).toBeVisible();
});

Then('the show count badge should read {string} for the created list', async ({ page, testData }, expectedCount) => {
  await expect(page.getByTestId(`list-card-count-${testData.listId}`)).toHaveText(expectedCount);
});

Then('both added shows should be visible in the list', async ({ page, testData }) => {
  await expect(page.getByText(testData.show1Name).first()).toBeVisible();
  await expect(page.getByText(testData.show2Name).first()).toBeVisible();
});
