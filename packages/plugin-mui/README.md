# @specwright/plugin-mui

> Specwright overlay plugin for Material UI (MUI v6) apps.

Installs on top of `@specwright/plugin` (base plugin required) and adds MUI-specific FIELD_TYPES, Playwright selector patterns, and agent knowledge for Material UI components.

---

## What it overrides

| File | What changes |
|---|---|
| `e2e-tests/utils/stepHelpers.js` | Adds `MUI_SELECT`, `MUI_AUTOCOMPLETE`, `MUI_DATE_PICKER`, `MUI_CHECKBOX`, `MUI_DIALOG_CONFIRM` FIELD_TYPES with correct portal-aware interaction handlers |
| `e2e-tests/playwright/auth-strategies/email-password.js` | Single-form login (email + password on one page) — replaces two-step flow; waits for `/todos`, `/home`, or `/dashboard` after submit |
| `.claude/agents/playwright/code-generator.md` | MUI v6 component patterns for all 10 component types (TextField, Select, Autocomplete, DatePicker, Checkbox, Dialog, Snackbar, Tabs, Chip, MUI class selectors) |
| `.claude/rules/dependencies.md` | MUI v6 + MUI X v7 import patterns, `data-testid` placement API per component type, Zustand persist, React Router |

---

## Requirements

- `@specwright/plugin` **≥ 0.3.7** installed on the target project first
- Node.js ≥ 18
- Target app uses Material UI v6 (`@mui/material`) with email + password authentication

---

## Install

```bash
# 1. Install base plugin first (if not already done)
npx @specwright/plugin init

# 2. Install this overlay
npx @specwright/plugin-mui install
```

Or via the **Specwright Desktop app** — select `@specwright/plugin-mui` as the overlay after base plugin setup.

---

## MUI-specific FIELD_TYPES

The overlay adds five new interaction types to `stepHelpers.js`:

### `MUI_SELECT`

MUI Select is NOT a native `<select>` — it renders as a `<div role="button">` that opens a Portal listbox. Never use `page.selectOption()`.

```javascript
// In fieldConfig:
{ 'Priority': { type: FIELD_TYPES.MUI_SELECT, testId: 'select-priority' } }

// What it does internally:
await page.getByTestId('select-priority').click();
await expect(page.getByRole('listbox')).toBeVisible();
await page.getByRole('option', { name: value, exact: true }).click();
```

### `MUI_AUTOCOMPLETE`

Fills the combobox input and clicks the matching option from the dropdown.

```javascript
{ 'Category': { type: FIELD_TYPES.MUI_AUTOCOMPLETE, testId: 'input-category' } }
```

### `MUI_DATE_PICKER`

Types directly into the masked date field in `MM/DD/YYYY` format — avoids the fragile calendar picker.

```javascript
{ 'Due Date': { type: FIELD_TYPES.MUI_DATE_PICKER, testId: 'input-due-date' } }
```

### `MUI_CHECKBOX`

Targets the native `<input type="checkbox">` placed via `inputProps`.

```javascript
{ 'Complete': { type: FIELD_TYPES.MUI_CHECKBOX, testId: `todo-complete-${testData.todoId}` } }
```

### `MUI_DIALOG_CONFIRM`

Waits for the MUI Dialog portal, clicks the confirm button, waits for the dialog to close.

```javascript
{ 'Delete': { type: FIELD_TYPES.MUI_DIALOG_CONFIRM, confirmTestId: 'btn-confirm-delete' } }
```

---

## `data-testid` placement (MUI v6 API)

MUI wraps native elements in divs — testids must be placed on the inner element:

```jsx
// TextField
<TextField slotProps={{ htmlInput: { 'data-testid': 'input-email' } }} />

// Autocomplete
<Autocomplete renderInput={(params) => (
  <TextField {...params} inputProps={{ ...params.inputProps, 'data-testid': 'input-category' }} />
)} />

// DatePicker (MUI X)
<DatePicker slotProps={{ textField: { inputProps: { 'data-testid': 'input-due-date' } } }} />

// Select — testid on root div directly
<Select data-testid="select-priority">

// Checkbox — testid on native input via inputProps
<Checkbox inputProps={{ 'data-testid': 'todo-complete-abc123' }} />
```

---

## Auth strategy

This overlay uses a **single-form email + password** strategy. Both fields are visible simultaneously on one page — no two-step email → continue → password flow.

Set credentials in `e2e-tests/.env.testing`:

```
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password
```

---

## Changelog

### [0.1.0] — 2026-04-20

Initial release.

- `MUI_SELECT` — click-to-open Portal listbox interaction (replaces `page.selectOption()`)
- `MUI_AUTOCOMPLETE` — fill + option click for combobox inputs
- `MUI_DATE_PICKER` — direct date field typing in `MM/DD/YYYY` format (avoids calendar picker)
- `MUI_CHECKBOX` — `inputProps`-based checkbox toggle and assertion
- `MUI_DIALOG_CONFIRM` — Portal dialog open/confirm/close sequence
- `MUI_SELECT_VALUE`, `MUI_TEXT_VISIBLE` — validation types for asserting selected values and visible text
- Single-form `email-password` auth strategy — waits for `/todos`, `/home`, or `/dashboard` post-login
- Code-generator agent with 10-section MUI v6 component pattern guide
- Dependencies rule doc with MUI v6, MUI X v7 (`AdapterDateFnsV3`), Zustand v5, React Router v6 import patterns
