/**
 * Steps: @TodoWorkflow — @0-Precondition
 *
 * Creates a todo with a generated title, High priority, and Work category.
 * Saves the todo title + localStorage snapshot as predata under scope "todoworkflow".
 *
 * Shared steps used here (from shared/):
 *   - Given I am logged in           → shared/auth.steps.js
 *   - When I navigate to {string}    → shared/navigation.steps.js
 */
import { When, Then, expect } from '../../../../../playwright/fixtures.js';
import { saveScopedTestData } from '../../../../../playwright/fixtures.js';
import { FIELD_TYPES, processDataTable } from '../../../../../utils/stepHelpers.js';

// ---------------------------------------------------------------------------
// FIELD_CONFIG — local to this steps file
// ---------------------------------------------------------------------------
const FIELD_CONFIG = {
  'Todo Title': {
    type: FIELD_TYPES.FILL,
    testID: 'input-todo-title',
  },
  'Priority': {
    type: FIELD_TYPES.MUI_SELECT,
    testID: 'select-priority',
  },
  'Category': {
    type: FIELD_TYPES.MUI_AUTOCOMPLETE,
    testID: 'input-category',
  },
};

// field name → page.testData cache key mapping
const fieldMapping = {
  'Todo Title': 'todoTitle',
  'Priority':   'todoPriority',
  'Category':   'todoCategory',
};

// ---------------------------------------------------------------------------
// Form Fill Steps
// ---------------------------------------------------------------------------

When('I fill the todo form with:', async ({ page }, dataTable) => {
  await processDataTable(page, dataTable, {
    mapping: fieldMapping,
    fieldConfig: FIELD_CONFIG,
  });
});

When('I submit the create todo form', async ({ page }) => {
  await page.getByTestId('btn-submit-todo').click();
});

// ---------------------------------------------------------------------------
// Assertion Steps
// ---------------------------------------------------------------------------

Then('I should be on the todos list page', async ({ page, testConfig }) => {
  await page.waitForURL(`${testConfig.baseUrl}/todos`);
  await expect(page.getByTestId('page-todos')).toBeVisible();
});

Then('the todo with the generated title should appear in the list', async ({ page }) => {
  await expect(page.getByText(page.testData?.todoTitle)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Predata Save Step
// ---------------------------------------------------------------------------

Then('I save the todo data as predata under scope {string}', async ({ page }, scope) => {
  // Snapshot the Zustand-persisted todos store from localStorage
  const todosRaw = await page.evaluate(() => localStorage.getItem('todo-app-todos'));
  const todosSnapshot = todosRaw ? JSON.parse(todosRaw) : null;

  saveScopedTestData(scope, {
    todoTitle: page.testData?.todoTitle,
    localStorage: {
      'todo-app-todos': todosSnapshot,
    },
  });
});
