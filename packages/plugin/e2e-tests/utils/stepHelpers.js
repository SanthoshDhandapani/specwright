/**
 * Step Definition Helper Functions
 * Provides reusable utilities for BDD step implementations with data tables.
 *
 * Core exports:
 * - FIELD_TYPES       — declarative field type constants
 * - processDataTable  — fills forms from Gherkin 3-column data tables
 * - validateExpectations — asserts displayed values from data tables
 * - fillFieldByName   — fill a single field using selector priority hierarchy
 * - selectDropDownByTestId — select option from a react-select dropdown
 */

import { expect } from '@playwright/test';
import _ from 'lodash';
import { generateValueForField } from './testDataGenerator.js';

// ─────────────────────────────────────────────────────────────
// FIELD_TYPES — declarative type constants
// ─────────────────────────────────────────────────────────────
export const FIELD_TYPES = {
  // Interaction types (used in processDataTable fieldConfig)
  FILL: 'FILL', // plain text input
  FILL_AND_ENTER: 'FILL_AND_ENTER', // fill then press Enter (multi-select tags)
  DROPDOWN: 'DROPDOWN', // react-select dropdown
  COMBO_BOX: 'COMBO_BOX', // creatable select (creates new option)
  CLICK: 'CLICK', // button / toggle via click
  CHECKBOX_TOGGLE: 'CHECKBOX_TOGGLE', // checkbox by label text
  TOGGLE: 'TOGGLE', // boolean toggle switch
  CUSTOM: 'CUSTOM', // write a fieldHandler for truly unique interactions

  // Validation types (used in validateExpectations validationConfig)
  INPUT_VALUE: 'INPUT_VALUE', // assert text input .value (toHaveValue)
  MULTI_SELECT_TAG: 'MULTI_SELECT_TAG', // react-select multi-value chip visible
  DROPDOWN_SINGLE_VALUE: 'DROPDOWN_SINGLE_VALUE', // react-select single-value text
  TEXT_VISIBLE: 'TEXT_VISIBLE', // assert text is visible by testID
};

// ─────────────────────────────────────────────────────────────
// processDataTable — fills forms from 3-column Gherkin data tables
// ─────────────────────────────────────────────────────────────

/**
 * Process a 3-column Gherkin data table (Field Name | Value | Type)
 * and interact with each field based on its FIELD_TYPE configuration.
 *
 * Handles:
 * - <gen_test_data> → generates faker value, caches in featureDataCache
 * - <from_test_data> → reads previously cached value
 * - Static values → uses as-is
 *
 * @param {Page} page - Playwright page
 * @param {DataTable} dataTable - Gherkin data table
 * @param {Object} config
 * @param {Object} config.mapping - Field name → page.testData property name
 * @param {Object} config.fieldConfig - Field name → { type: FIELD_TYPES.*, testID?, selector?, ... }
 * @param {Object} config.fieldHandlers - Field name → async (page, value) => {} for CUSTOM types
 * @param {Locator|Page} config.container - Scope all locators to this element (default: page)
 */
export async function processDataTable(page, dataTable, config = {}) {
  const { mapping = {}, fieldConfig = {}, fieldHandlers = {}, container = page } = config;

  const rows = dataTable.hashes();

  for (const row of rows) {
    const fieldName = row['Field Name'] || row['Field'] || row['Name'];
    const valueType = (row['Type'] || 'Static').toLowerCase();
    let value = row['Value'] || row['Expected Value'] || '';

    // ── Step 1: Resolve value from placeholder ──
    if (value === '<gen_test_data>') {
      // Generate: check if mapping points to existing testData, otherwise generate with faker
      if (mapping[fieldName] && page.testData?.[mapping[fieldName]] !== undefined) {
        value = page.testData[mapping[fieldName]];
      } else {
        value = generateValueForField(fieldName);
      }
      // Cache SharedGenerated values for later <from_test_data> reads
      if (valueType === 'sharedgenerated') {
        const cacheKey = mapping[fieldName] || _.snakeCase(fieldName);
        if (!page.testData) page.testData = {};
        page.testData[cacheKey] = value;
        // Also write to featureDataCache for cross-scenario persistence
        const featureKey = getFeatureKey(page);
        if (featureKey) {
          if (!globalThis.__rt_featureDataCache) globalThis.__rt_featureDataCache = {};
          if (!globalThis.__rt_featureDataCache[featureKey]) globalThis.__rt_featureDataCache[featureKey] = {};
          globalThis.__rt_featureDataCache[featureKey][cacheKey] = value;
        }
        console.log(`🎲 Generated "${fieldName}" → ${cacheKey}: ${value}`);
      }
    } else if (value === '<from_test_data>') {
      // Read: look up from page.testData or featureDataCache
      const cacheKey = mapping[fieldName] || _.snakeCase(fieldName);
      if (page.testData?.[cacheKey] !== undefined) {
        value = page.testData[cacheKey];
        console.log(`📖 Read "${fieldName}" → ${cacheKey}: ${value}`);
      } else {
        // Try featureDataCache
        const featureKey = getFeatureKey(page);
        const cached = featureKey && globalThis.__rt_featureDataCache?.[featureKey]?.[cacheKey];
        if (cached) {
          value = cached;
          console.log(`📖 Read from cache "${fieldName}" → ${cacheKey}: ${value}`);
        } else {
          console.warn(`⚠️ No cached value for "${fieldName}" (key: ${cacheKey})`);
        }
      }
    }
    // Static values: use as-is

    // ── Step 2: Interact with the field ──
    if (fieldHandlers[fieldName]) {
      await fieldHandlers[fieldName](page, value);
    } else if (fieldConfig[fieldName]) {
      await executeFieldInteraction(page, fieldName, value, fieldConfig[fieldName], container);
    } else {
      // Fallback: try to fill by testID derived from field name
      await fillFieldByName(container, fieldName, value);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// validateExpectations — asserts displayed values from data tables
// ─────────────────────────────────────────────────────────────

/**
 * Validate displayed values from a 3-column Gherkin data table.
 * Reads <from_test_data> from page.testData or featureDataCache.
 *
 * @param {Page} page - Playwright page
 * @param {DataTable} dataTable - Gherkin data table
 * @param {Object} config
 * @param {Object} config.mapping - Field name → page.testData property name
 * @param {Object} config.validationConfig - Field name → { type: FIELD_TYPES.*, testID?, selector? }
 * @param {Locator|Page} config.container - Scope assertions to this element (default: page)
 */
export async function validateExpectations(page, dataTable, config = {}) {
  const { mapping = {}, validationConfig = {}, container = page } = config;

  const rows = dataTable.hashes();

  for (const row of rows) {
    const fieldName = row['Field Name'] || row['Field'] || row['Element'];
    let expectedValue = row['Expected Value'] || row['Value'] || '';

    // ── Resolve <from_test_data> placeholder ──
    if (expectedValue === '<from_test_data>') {
      const cacheKey = mapping[fieldName] || _.snakeCase(fieldName);
      if (page.testData?.[cacheKey] !== undefined) {
        expectedValue = page.testData[cacheKey];
        console.log(`✅ Validate "${fieldName}" → ${cacheKey}: ${expectedValue}`);
      } else {
        const featureKey = getFeatureKey(page);
        const cached = featureKey && globalThis.__rt_featureDataCache?.[featureKey]?.[cacheKey];
        if (cached) {
          expectedValue = cached;
          console.log(`✅ Validate from cache "${fieldName}" → ${cacheKey}: ${expectedValue}`);
        } else {
          throw new Error(
            `No cached value for "${fieldName}" (key: ${cacheKey}). Was <gen_test_data> used in a prior fill step?`,
          );
        }
      }
    }

    // ── Execute validation ──
    const vConfig = validationConfig[fieldName];
    if (vConfig) {
      await executeValidation(page, fieldName, expectedValue, vConfig, container);
    } else {
      // Fallback: find element by text
      await expect(page.getByText(expectedValue, { exact: false }).first()).toBeVisible();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// fillFieldByName — fill a single field using selector priority
// ─────────────────────────────────────────────────────────────

/**
 * Fill a field using Playwright's selector priority hierarchy.
 * Tries: testID → name → placeholder → label → CSS fallback
 */
export async function fillFieldByName(container, fieldName, value) {
  const fieldKebab = _.kebabCase(fieldName);

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
    } catch {
      continue;
    }
  }

  throw new Error(`Could not find field "${fieldName}" using any selector strategy.`);
}

// ─────────────────────────────────────────────────────────────
// selectDropDownByTestId — select option from react-select
// ─────────────────────────────────────────────────────────────

/**
 * Select an option from a React Select dropdown by testID.
 * Opens the dropdown, finds the option by text, clicks it.
 */
export async function selectDropDownByTestId(page, fieldName, value, autoKebab = true) {
  const testId = autoKebab ? _.kebabCase(fieldName) : fieldName;

  const dropdownContainer = page.getByTestId(testId);
  await dropdownContainer.waitFor({ state: 'visible', timeout: 5000 });

  const control = dropdownContainer
    .locator('.react-select__control, .react-select__dropdown-indicator, [class*="select__control"]')
    .first();
  await control.waitFor({ state: 'visible', timeout: 5000 });
  await control.click();
  await page.waitForTimeout(300);

  // Portal renders at document.body — must use page root
  const option = page.locator('.react-select__menu-list').locator('.react-select__option').filter({ hasText: value });

  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();

  await page
    .locator('.react-select__menu-list')
    .waitFor({ state: 'detached', timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(300);
}

// ─────────────────────────────────────────────────────────────
// Internal: executeFieldInteraction
// ─────────────────────────────────────────────────────────────

async function executeFieldInteraction(page, fieldName, value, config, container = page) {
  switch (config.type) {
    case FIELD_TYPES.FILL:
      if (config.testID) {
        const el = container.getByTestId(config.testID);
        const count = await el.count();
        await (count > 1 ? el.first() : el).fill(value);
      } else if (config.selector) {
        await container.locator(config.selector).fill(value);
      } else if (config.placeholder) {
        await container.getByPlaceholder(config.placeholder).fill(value);
      } else {
        await fillFieldByName(container, fieldName, value);
      }
      break;

    case FIELD_TYPES.FILL_AND_ENTER: {
      const input = container.getByRole(config.role || 'textbox', {
        name: config.name || fieldName,
      });
      await input.fill(value);
      await input.press('Enter');
      break;
    }

    case FIELD_TYPES.DROPDOWN:
      if (config.testID) {
        const dropEl = container.getByTestId(config.testID);
        const ctrl = dropEl.locator('.react-select__control, .react-select__dropdown-indicator').first();
        await ctrl.waitFor({ state: 'visible', timeout: 5000 });
        await ctrl.click();
        await page.waitForTimeout(300);
        const menuList = page.locator('.react-select__menu-list');
        await expect(menuList).toBeVisible({ timeout: 5000 });
        const opt = menuList.locator('.react-select__option').filter({ hasText: value });
        const matched = (await opt.count()) > 0 ? opt.first() : menuList.locator('.react-select__option').first();
        await matched.click();
        await page
          .locator('.react-select__menu-list')
          .waitFor({ state: 'detached', timeout: 3000 })
          .catch(() => {});
        await page.waitForTimeout(300);
      } else {
        await selectDropDownByTestId(page, fieldName, value);
      }
      break;

    case FIELD_TYPES.COMBO_BOX:
      if (config.testID) {
        await container.getByTestId(config.testID).fill(value);
      } else if (config.placeholder) {
        await container.getByPlaceholder(config.placeholder).fill(value);
      } else {
        await fillFieldByName(container, fieldName, value);
      }
      await page.getByRole('link', { name: `Create: ${value}` }).click();
      break;

    case FIELD_TYPES.CLICK:
      if (config.testID) {
        await container.getByTestId(config.testID).click();
      } else if (config.selector) {
        await container.locator(config.selector).click();
      } else if (config.role) {
        await container.getByRole(config.role, { name: config.name || value }).click();
      } else {
        await container.getByText(value).click();
      }
      break;

    case FIELD_TYPES.CHECKBOX_TOGGLE:
      if (config.testID) {
        await container.getByTestId(config.testID).filter({ hasText: fieldName }).click();
      } else {
        await container.getByTestId('checkbox').filter({ hasText: fieldName }).click();
      }
      break;

    case FIELD_TYPES.TOGGLE:
      if (config.testID) {
        await container.getByTestId(config.testID).click();
      } else if (config.selector) {
        await container.locator(config.selector).click();
      }
      break;

    case FIELD_TYPES.CUSTOM:
      console.warn(`CUSTOM field "${fieldName}" requires a fieldHandler. Skipping.`);
      break;

    default:
      if (config.testID) {
        await container.getByTestId(config.testID).fill(value);
      } else {
        await fillFieldByName(container, fieldName, value);
      }
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// Internal: executeValidation
// ─────────────────────────────────────────────────────────────

async function executeValidation(page, fieldName, expectedValue, config, container = page) {
  switch (config.type) {
    case FIELD_TYPES.INPUT_VALUE:
      if (config.testID) {
        await expect(container.getByTestId(config.testID)).toHaveValue(expectedValue, { timeout: 5000 });
      } else if (config.selector) {
        await expect(container.locator(config.selector)).toHaveValue(expectedValue, { timeout: 5000 });
      }
      break;

    case FIELD_TYPES.MULTI_SELECT_TAG:
      await expect(
        container.locator('.react-select__multi-value__label').filter({ hasText: expectedValue }),
      ).toBeVisible({ timeout: 5000 });
      break;

    case FIELD_TYPES.DROPDOWN_SINGLE_VALUE:
      if (config.testID) {
        await expect(container.locator(`[data-testid="${config.testID}"] .react-select__single-value`)).toContainText(
          expectedValue,
          { timeout: 5000 },
        );
      }
      break;

    case FIELD_TYPES.TEXT_VISIBLE:
      if (config.testID) {
        const el = container.getByTestId(config.testID);
        await expect(el).toBeVisible();
        await expect(el).toHaveText(expectedValue);
      } else {
        await expect(page.getByText(expectedValue, { exact: false }).first()).toBeVisible();
      }
      break;

    default:
      await expect(page.getByText(expectedValue, { exact: false }).first()).toBeVisible();
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// Internal: getFeatureKey helper
// ─────────────────────────────────────────────────────────────

function getFeatureKey(page) {
  return page.featureKey || null;
}
