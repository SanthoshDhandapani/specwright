/**
 * Steps: @TodoWorkflow — @1-VerifyInList
 *
 * Verifies the todo created by @0-Precondition:
 *   - Appears in the list with correct title and priority
 *   - Can be marked as complete and shown in the Completed tab
 *   - Can be deleted via the MUI confirmation dialog
 *
 * Shared steps used here (from shared/):
 *   - Given I am logged in              → shared/auth.steps.js
 *   - Given I load predata from {string} → shared/workflow.steps.js
 *   - When I navigate to {string}       → shared/navigation.steps.js
 */
import { When, Then, expect } from '../../../../../playwright/fixtures.js';

// ---------------------------------------------------------------------------
// Helper — locate the todo item row matching the title from predata
// ---------------------------------------------------------------------------
function getTodoItem(page, title) {
  return page.locator('[data-testid^="todo-item-"]').filter({ hasText: title });
}

// ---------------------------------------------------------------------------
// Assertion Steps
// ---------------------------------------------------------------------------

Then('the todo from predata should be visible in the list', async ({ page, testData }) => {
  await expect(getTodoItem(page, testData.todoTitle)).toBeVisible();
});

Then('the todo priority should display {string}', async ({ page, testData }, priority) => {
  const todoItem = getTodoItem(page, testData.todoTitle);
  await expect(todoItem.locator('[data-testid^="todo-priority-"]')).toHaveText(priority);
});

Then('the todo from predata should no longer be visible', async ({ page, testData }) => {
  await expect(page.getByTestId('dialog-confirm-delete')).not.toBeVisible();
  await expect(page.getByText(testData.todoTitle)).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Complete Checkbox Steps
// ---------------------------------------------------------------------------

When('I click the complete checkbox on the todo from predata', async ({ page, testData }) => {
  const todoItem = getTodoItem(page, testData.todoTitle);
  await todoItem.locator('[data-testid^="todo-complete-"]').click();
});

Then('the todo checkbox should be checked', async ({ page, testData }) => {
  const todoItem = getTodoItem(page, testData.todoTitle);
  await expect(todoItem.locator('[data-testid^="todo-complete-"]')).toBeChecked();
});

// ---------------------------------------------------------------------------
// Filter Tab Step
// ---------------------------------------------------------------------------

When('I click the {string} filter tab', async ({ page }, tabName) => {
  const tabTestIds = {
    All: 'filter-tab-all',
    Active: 'filter-tab-active',
    Completed: 'filter-tab-completed',
  };
  const testId = tabTestIds[tabName];
  if (!testId) throw new Error(`Unknown filter tab: "${tabName}". Expected: All, Active, Completed`);
  await page.getByTestId(testId).click();
});

// ---------------------------------------------------------------------------
// Delete Flow Steps
// ---------------------------------------------------------------------------

When('I click the delete button on the todo from predata', async ({ page, testData }) => {
  const todoItem = getTodoItem(page, testData.todoTitle);
  await todoItem.locator('[data-testid^="btn-delete-"]').click();
});

Then('the delete confirmation dialog should appear', async ({ page }) => {
  await expect(page.getByTestId('dialog-confirm-delete')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Delete Todo' })).toBeVisible();
});

When('I confirm the deletion', async ({ page }) => {
  await page.getByTestId('btn-confirm-delete').click();
});
