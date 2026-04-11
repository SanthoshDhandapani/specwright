# Framework Generation Context
<!-- Regenerate: node e2e-tests/scripts/extract-generate-context.js -->
<!-- Last updated: 2026-04-11 -->

## FIELD_TYPES Constants

Import path follows the **Import Path Depth Reference** table at the bottom of this document.
Example from `@Modules/@Mod/steps.js`: `import { FIELD_TYPES, processDataTable, validateExpectations } from '../../../../utils/stepHelpers.js';`

### Interaction Types (processDataTable fieldConfig)

| Constant | Value | When to Use |
|---|---|---|
| `FIELD_TYPES.FILL` | `"FILL"` | plain text input |
| `FIELD_TYPES.FILL_AND_ENTER` | `"FILL_AND_ENTER"` | fill then press Enter (tags, chips) |
| `FIELD_TYPES.DROPDOWN` | `"DROPDOWN"` | native <select> or ARIA combobox |
| `FIELD_TYPES.CLICK` | `"CLICK"` | button / toggle via click |
| `FIELD_TYPES.CHECKBOX_TOGGLE` | `"CHECKBOX_TOGGLE"` | checkbox by label text |
| `FIELD_TYPES.TOGGLE` | `"TOGGLE"` | boolean toggle switch |
| `FIELD_TYPES.CUSTOM` | `"CUSTOM"` | write a fieldHandler for truly unique interactions |

### Validation Types (validateExpectations validationConfig)

| Constant | When to Use |
|---|---|
| `FIELD_TYPES.INPUT_VALUE` | assert text input .value (toHaveValue) |
| `FIELD_TYPES.DROPDOWN_VALUE` | assert selected option text |
| `FIELD_TYPES.TEXT_VISIBLE` | assert text is visible by testID |

## processDataTable API

```javascript
await processDataTable(page, dataTable, {
  mapping: { 'Field Name': 'cacheKey' },          // field label → page.testData property
  fieldConfig: {
    'Field Name': { type: FIELD_TYPES.FILL, testID: 'input-testid' },
    'Select Field': { type: FIELD_TYPES.DROPDOWN, testID: 'select-testid' },
    'Button': { type: FIELD_TYPES.CLICK, testID: 'btn-testid' },
  },
  fieldHandlers: {                                  // CUSTOM type only
    'Special Field': async (page, value) => { /* ... */ },
  },
  container: page,                                  // scope locators (default: page)
});
```

**Auto-handling:**
- `<gen_test_data>` → generates faker value via `generateValueForField(fieldName)`, caches in `page.testData[cacheKey]` and `featureDataCache` (for `SharedGenerated` type)
- `<from_test_data>` → reads from `page.testData[cacheKey]` then `featureDataCache`
- No `fieldConfig` entry → falls back to `fillFieldByName()` (testID → name attr → placeholder → label → role)

## validateExpectations API

```javascript
await validateExpectations(page, dataTable, {
  mapping: { 'Field Name': 'cacheKey' },
  validationConfig: {
    'Field Name': { type: FIELD_TYPES.INPUT_VALUE, testID: 'input-testid' },
    'Display Field': { type: FIELD_TYPES.TEXT_VISIBLE, testID: 'display-testid' },
  },
  container: page,
});
```

**Auto-handling:** `<from_test_data>` reads from `page.testData[cacheKey]` then `featureDataCache`. Throws if no cached value found.

## generateValueForField Patterns

| Field name contains | Generated value |
|---|---|
| `email` | `faker.internet.email().toLowerCase()` |
| `phone` | `faker.phone.number({ style: 'national' })` |
| `name` / `company` | `faker.company.name()` |
| `name` | `faker.person.fullName()` |
| `catchphrase` / `catch phrase` | `faker.company.catchPhrase()` |
| `address` / `street` | `faker.location.streetAddress()` |
| `city` | `faker.location.city()` |
| `zip` / `postal` | `faker.location.zipCode()` |
| `country` | `faker.location.country()` |
| `state` | `faker.location.state()` |
| `website` / `url` | `faker.internet.url()` |
| `description` / `comment` | `faker.lorem.sentence()` |
| `id` / `number` / `code` | `faker.string.alphanumeric(8).toUpperCase()` |
| `tag` | `faker.string.alphanumeric(6).toUpperCase()` |
| `date` | `faker.date.future().toISOString().split('T')[0]` |
| `amount` / `price` / `quantity` | `faker.number.int({ min: 1, max: 1000 }).toString()` |
| _(default)_ | ``${faker.lorem.word()}_${Date.now().toString().slice(-6)}`` |

## Import Path Depth Reference

The number of `../` levels = (directory depth from `e2e-tests/features/playwright-bdd/` + 2).

| Steps file location | fixtures.js import | stepHelpers.js import |
|---|---|---|
| `@Modules/@Mod/steps.js` | `../../../../playwright/fixtures.js` | `../../../../utils/stepHelpers.js` |
| `@Modules/@Mod/@Sub/steps.js` | `../../../../../playwright/fixtures.js` | `../../../../../utils/stepHelpers.js` |
| `@Workflows/@Flow/@0-Pre/steps.js` | `../../../../../playwright/fixtures.js` | `../../../../../utils/stepHelpers.js` |
| `shared/steps.js` | `../playwright/fixtures.js` | `../utils/stepHelpers.js` |
