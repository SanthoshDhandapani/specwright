/**
 * Step Definition Helper Functions — @specwright/plugin-mui overlay
 *
 * Extends the base @specwright/plugin stepHelpers with Material UI v6
 * component interaction types:
 *   MUI_SELECT        — MUI Select (not a native <select>)
 *   MUI_AUTOCOMPLETE  — MUI Autocomplete (combobox + option list)
 *   MUI_DATE_PICKER   — MUI X DatePicker (type directly into field)
 *   MUI_CHECKBOX      — MUI Checkbox (click the label span)
 *   MUI_DIALOG_CONFIRM — click a button inside a MUI Dialog
 *   MUI_TEXT_VISIBLE   — assert text visible via MUI Typography or any element
 *
 * All base FIELD_TYPES, processDataTable, validateExpectations, fillFieldByName,
 * and selectDropdown are re-exported unchanged.
 */

import { expect } from '@playwright/test';
import { generateValueForField } from './testDataGenerator.js';

const snakeCase = (str) => str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s\-]+/g, '_').toLowerCase();
const kebabCase = (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

// ─────────────────────────────────────────────────────────────
// FIELD_TYPES — base + MUI additions
// ─────────────────────────────────────────────────────────────
export const FIELD_TYPES = {
  // ── Base interaction types ──────────────────────────────────
  FILL: 'FILL',
  FILL_AND_ENTER: 'FILL_AND_ENTER',
  DROPDOWN: 'DROPDOWN',
  CLICK: 'CLICK',
  CHECKBOX_TOGGLE: 'CHECKBOX_TOGGLE',
  TOGGLE: 'TOGGLE',
  CUSTOM: 'CUSTOM',

  // ── Base validation types ───────────────────────────────────
  INPUT_VALUE: 'INPUT_VALUE',
  DROPDOWN_VALUE: 'DROPDOWN_VALUE',
  TEXT_VISIBLE: 'TEXT_VISIBLE',

  // ── MUI-specific interaction types ──────────────────────────

  /**
   * MUI Select — NOT a native <select>. Renders as a div with role="combobox".
   * Config: { type: FIELD_TYPES.MUI_SELECT, testId: 'select-priority' }
   * Interaction: click the Select root → wait for listbox → click option by name.
   */
  MUI_SELECT: 'MUI_SELECT',

  /**
   * MUI Autocomplete — combobox with a filterable option list.
   * Config: { type: FIELD_TYPES.MUI_AUTOCOMPLETE, testId: 'input-category' }
   * Interaction: fill the combobox input → wait for option → click.
   * For freeform (no option match): fill + press Tab.
   */
  MUI_AUTOCOMPLETE: 'MUI_AUTOCOMPLETE',

  /**
   * MUI X DatePicker — type directly into the masked input field.
   * Config: { type: FIELD_TYPES.MUI_DATE_PICKER, testId: 'input-due-date' }
   * Value format: 'MM/DD/YYYY'
   * Interaction: click field → triple-click to select all → type value.
   */
  MUI_DATE_PICKER: 'MUI_DATE_PICKER',

  /**
   * MUI Checkbox — the visible element is a span; the input has role="checkbox".
   * Config: { type: FIELD_TYPES.MUI_CHECKBOX, testId: 'todo-complete-{id}' }
   * Interaction: click via testId (targets the input[type=checkbox]).
   */
  MUI_CHECKBOX: 'MUI_CHECKBOX',

  /**
   * MUI Dialog Confirm — waits for a dialog then clicks a confirm button inside it.
   * Config: { type: FIELD_TYPES.MUI_DIALOG_CONFIRM, confirmTestId: 'btn-confirm-delete' }
   */
  MUI_DIALOG_CONFIRM: 'MUI_DIALOG_CONFIRM',

  // ── MUI validation types ────────────────────────────────────

  /**
   * Assert text content of a MUI element (Typography, Chip, etc.) by testId.
   * Config: { type: FIELD_TYPES.MUI_TEXT_VISIBLE, testId: 'todo-priority-{id}' }
   */
  MUI_TEXT_VISIBLE: 'MUI_TEXT_VISIBLE',

  /**
   * Assert a MUI Select's displayed value by testId.
   * Config: { type: FIELD_TYPES.MUI_SELECT_VALUE, testId: 'select-priority' }
   */
  MUI_SELECT_VALUE: 'MUI_SELECT_VALUE',
};

// ─────────────────────────────────────────────────────────────
// processDataTable — fills forms from 3-column Gherkin data tables
// ─────────────────────────────────────────────────────────────
export async function processDataTable(page, dataTable, config = {}) {
  const { mapping = {}, fieldConfig = {}, fieldHandlers = {}, container = page } = config;
  const rows = dataTable.hashes();

  for (const row of rows) {
    const fieldName = row['Field Name'] || row['Field'] || row['Name'];
    const valueType = (row['Type'] || 'Static').toLowerCase();
    let value = row['Value'] || row['Expected Value'] || '';

    if (value === '<gen_test_data>') {
      if (mapping[fieldName] && page.testData?.[mapping[fieldName]] !== undefined) {
        value = page.testData[mapping[fieldName]];
      } else {
        value = generateValueForField(fieldName);
      }
      if (valueType === 'sharedgenerated') {
        const cacheKey = mapping[fieldName] || snakeCase(fieldName);
        if (!page.testData) page.testData = {};
        page.testData[cacheKey] = value;
        const featureKey = page.featureKey || null;
        if (featureKey) {
          if (!globalThis.__rt_featureDataCache) globalThis.__rt_featureDataCache = {};
          if (!globalThis.__rt_featureDataCache[featureKey]) globalThis.__rt_featureDataCache[featureKey] = {};
          globalThis.__rt_featureDataCache[featureKey][cacheKey] = value;
        }
        console.log(`🎲 Generated "${fieldName}" → ${cacheKey}: ${value}`);
      }
    } else if (value === '<from_test_data>') {
      const cacheKey = mapping[fieldName] || snakeCase(fieldName);
      if (page.testData?.[cacheKey] !== undefined) {
        value = page.testData[cacheKey];
      } else {
        const featureKey = page.featureKey || null;
        const cached = featureKey && globalThis.__rt_featureDataCache?.[featureKey]?.[cacheKey];
        if (cached) {
          value = cached;
        } else {
          console.warn(`⚠️ No cached value for "${fieldName}" (key: ${cacheKey})`);
        }
      }
    }

    if (fieldHandlers[fieldName]) {
      await fieldHandlers[fieldName](page, value);
    } else if (fieldConfig[fieldName]) {
      await executeFieldInteraction(page, fieldName, value, fieldConfig[fieldName], container);
    } else {
      await fillFieldByName(container, fieldName, value);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// validateExpectations
// ─────────────────────────────────────────────────────────────
export async function validateExpectations(page, dataTable, config = {}) {
  const { mapping = {}, validationConfig = {}, container = page } = config;
  const rows = dataTable.hashes();

  for (const row of rows) {
    const fieldName = row['Field Name'] || row['Field'] || row['Element'];
    let expectedValue = row['Expected Value'] || row['Value'] || '';

    if (expectedValue === '<from_test_data>') {
      const cacheKey = mapping[fieldName] || snakeCase(fieldName);
      if (page.testData?.[cacheKey] !== undefined) {
        expectedValue = page.testData[cacheKey];
      } else {
        const featureKey = page.featureKey || null;
        const cached = featureKey && globalThis.__rt_featureDataCache?.[featureKey]?.[cacheKey];
        if (cached) {
          expectedValue = cached;
        } else {
          throw new Error(`No cached value for "${fieldName}" (key: ${cacheKey}).`);
        }
      }
    }

    const vConfig = validationConfig[fieldName];
    if (vConfig) {
      await executeValidation(page, fieldName, expectedValue, vConfig, container);
    } else {
      await expect(page.getByText(expectedValue, { exact: false }).first()).toBeVisible();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// fillFieldByName
// ─────────────────────────────────────────────────────────────
export async function fillFieldByName(container, fieldName, value) {
  const fieldKebab = kebabCase(fieldName);
  const strategies = [
    () => container.getByTestId(fieldKebab),
    () => container.getByTestId(`input-${fieldKebab}`),
    () => container.locator(`input[name="${fieldName}"]`),
    () => container.locator(`input[name="${fieldKebab}"]`),
    () => container.getByPlaceholder(new RegExp(fieldName, 'i')),
    () => container.getByLabel(fieldName),
    () => container.getByRole('textbox', { name: fieldName }),
  ];
  for (const getLocator of strategies) {
    try {
      const element = getLocator();
      if ((await element.count()) > 0) {
        const target = (await element.count()) > 1 ? element.first() : element;
        await target.fill(value);
        return;
      }
    } catch { continue; }
  }
  throw new Error(`Could not find field "${fieldName}" using any selector strategy.`);
}

// ─────────────────────────────────────────────────────────────
// selectDropdown
// ─────────────────────────────────────────────────────────────
export async function selectDropdown(container, fieldName, value) {
  const fieldKebab = kebabCase(fieldName);
  const selectByTestId = container.getByTestId(fieldKebab);
  if ((await selectByTestId.count()) > 0) {
    const tag = await selectByTestId.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') { await selectByTestId.selectOption({ label: value }); return; }
  }
  const combobox = container.getByRole('combobox', { name: new RegExp(fieldName, 'i') });
  if ((await combobox.count()) > 0) {
    await combobox.click();
    const option = container.getByRole('option', { name: value });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    return;
  }
  const selectByName = container.locator(`select[name="${fieldName}"], select[name="${fieldKebab}"]`);
  if ((await selectByName.count()) > 0) { await selectByName.first().selectOption({ label: value }); return; }
  throw new Error(`Could not find dropdown "${fieldName}".`);
}

// ─────────────────────────────────────────────────────────────
// Internal: executeFieldInteraction (base + MUI cases)
// ─────────────────────────────────────────────────────────────
async function executeFieldInteraction(page, fieldName, value, config, container = page) {
  switch (config.type) {
    // ── Base types ──────────────────────────────────────────
    case FIELD_TYPES.FILL:
      if (config.testId || config.testID) {
        const el = container.getByTestId(config.testId || config.testID);
        await (await el.count() > 1 ? el.first() : el).fill(value);
      } else if (config.selector) {
        await container.locator(config.selector).fill(value);
      } else {
        await fillFieldByName(container, fieldName, value);
      }
      break;

    case FIELD_TYPES.FILL_AND_ENTER: {
      const input = container.getByRole(config.role || 'textbox', { name: config.name || fieldName });
      await input.fill(value);
      await input.press('Enter');
      break;
    }

    case FIELD_TYPES.DROPDOWN:
      if (config.testId || config.testID) {
        const el = container.getByTestId(config.testId || config.testID);
        const tag = await el.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
        if (tag === 'select') {
          await el.selectOption({ label: value });
        } else {
          await el.click();
          const option = page.getByRole('option', { name: value });
          await option.waitFor({ state: 'visible', timeout: 5000 });
          await option.click();
        }
      } else {
        await selectDropdown(container, fieldName, value);
      }
      break;

    case FIELD_TYPES.CLICK:
      if (config.testId || config.testID) {
        await container.getByTestId(config.testId || config.testID).click();
      } else if (config.selector) {
        await container.locator(config.selector).click();
      } else if (config.role) {
        await container.getByRole(config.role, { name: config.name || value }).click();
      } else {
        await container.getByText(value).click();
      }
      break;

    case FIELD_TYPES.CHECKBOX_TOGGLE:
      if (config.testId || config.testID) {
        await container.getByTestId(config.testId || config.testID).click();
      } else {
        await container.getByRole('checkbox', { name: new RegExp(fieldName, 'i') }).click();
      }
      break;

    case FIELD_TYPES.TOGGLE:
      if (config.testId || config.testID) {
        await container.getByTestId(config.testId || config.testID).click();
      } else {
        await container.getByRole('switch', { name: new RegExp(fieldName, 'i') }).click();
      }
      break;

    // ── MUI types ───────────────────────────────────────────

    case FIELD_TYPES.MUI_SELECT: {
      // MUI Select renders as a div, not a native <select>.
      // Click to open the dropdown (renders a listbox in a Portal), then click the option.
      const selectEl = container.getByTestId(config.testId || config.testID);
      await selectEl.click();
      const listbox = page.getByRole('listbox');
      await listbox.waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('option', { name: value, exact: true }).click();
      // Wait for listbox to close
      await listbox.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      break;
    }

    case FIELD_TYPES.MUI_AUTOCOMPLETE: {
      // MUI Autocomplete: fill the combobox input to filter options, then click the matching option.
      const combobox = container.getByTestId(config.testId || config.testID);
      await combobox.click();
      await combobox.fill(value);
      const option = page.getByRole('option', { name: value, exact: true });
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      } else {
        // Freeform — no matching option, press Tab to accept typed value
        await combobox.press('Tab');
      }
      break;
    }

    case FIELD_TYPES.MUI_DATE_PICKER: {
      // MUI X DatePicker: type the date directly into the masked input.
      // Triple-click to select all existing content first, then type.
      const dateInput = container.getByTestId(config.testId || config.testID);
      await dateInput.click();
      await dateInput.selectText().catch(() => {});
      await dateInput.fill(value);
      await dateInput.press('Tab');
      break;
    }

    case FIELD_TYPES.MUI_CHECKBOX: {
      // MUI Checkbox: the data-testid is on the input[type=checkbox] element.
      const checkbox = container.getByTestId(config.testId || config.testID);
      const isChecked = await checkbox.isChecked();
      const shouldCheck = value === 'true' || value === true;
      if (isChecked !== shouldCheck) {
        await checkbox.click();
      }
      break;
    }

    case FIELD_TYPES.MUI_DIALOG_CONFIRM: {
      // Wait for MUI Dialog to be visible, then click the confirm button inside it.
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await dialog.getByTestId(config.confirmTestId).click();
      await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      break;
    }

    case FIELD_TYPES.CUSTOM:
      console.warn(`CUSTOM field "${fieldName}" requires a fieldHandler. Skipping.`);
      break;

    default:
      if (config.testId || config.testID) {
        await container.getByTestId(config.testId || config.testID).fill(value);
      } else {
        await fillFieldByName(container, fieldName, value);
      }
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// Internal: executeValidation (base + MUI cases)
// ─────────────────────────────────────────────────────────────
async function executeValidation(page, fieldName, expectedValue, config, container = page) {
  switch (config.type) {
    case FIELD_TYPES.INPUT_VALUE:
      await expect(
        container.getByTestId(config.testId || config.testID)
      ).toHaveValue(expectedValue, { timeout: 5000 });
      break;

    case FIELD_TYPES.DROPDOWN_VALUE: {
      const el = container.getByTestId(config.testId || config.testID);
      const tag = await el.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
      if (tag === 'select') {
        await expect(el.locator('option:checked')).toHaveText(expectedValue, { timeout: 5000 });
      } else {
        await expect(el).toContainText(expectedValue, { timeout: 5000 });
      }
      break;
    }

    case FIELD_TYPES.TEXT_VISIBLE:
    case FIELD_TYPES.MUI_TEXT_VISIBLE: {
      const el = container.getByTestId(config.testId || config.testID);
      await expect(el).toBeVisible();
      await expect(el).toHaveText(expectedValue);
      break;
    }

    case FIELD_TYPES.MUI_SELECT_VALUE: {
      // MUI Select displays the selected value as text inside the select div
      const selectEl = container.getByTestId(config.testId || config.testID);
      await expect(selectEl).toContainText(expectedValue, { timeout: 5000 });
      break;
    }

    default:
      await expect(page.getByText(expectedValue, { exact: false }).first()).toBeVisible();
      break;
  }
}
