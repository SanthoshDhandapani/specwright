# Changelog — @specwright/plugin-mui

All notable changes to this package are documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [0.1.4] — 2026-04-20

### Changed

- **`specwright.plugin.json` — updated base plugin requirement to `>=0.4.0`.** Tracks the `@specwright/plugin` 0.4.0 release which ships `.specwright/.gitkeep` as part of the install, removes the redundant `mkdir -p .specwright` from Phase 1, and refines the `.gitignore.snippet` rule to track the sentinel while ignoring runtime files.

---

## [0.1.3] — 2026-04-20

### Fixed

- **`code-generator.md` — MUI form consolidation rule.** Added explicit rule that when a feature file's data table contains multiple form fields including MUI components, ALL fields MUST be in the same `processDataTable` call — never split into individual steps. Added a complete `FIELD_CONFIG` example showing `FILL`, `MUI_SELECT`, `MUI_AUTOCOMPLETE`, `MUI_DATE_PICKER`, and `MUI_CHECKBOX` in a single config block. This fixes a regression where agents generated separate `When I set the priority to {string}` and `When I set the category to {string}` steps instead of consolidating them into the data table, bypassing `processDataTable` entirely.

---

## [0.1.2] — 2026-04-20

### Added

- **`update` command** — `npx @specwright/plugin-mui update [target-dir]` runs a two-step update: first calls `npx @specwright/plugin@latest update` to refresh base framework files (fixtures, agents, skills, templates), then re-applies the MUI overlay overrides. A single command keeps both layers in sync.

---

## [0.1.1] — 2026-04-20

### Added

- **`cli.js` + `bin` entry** — `npx @specwright/plugin-mui install [target-dir]` now works. The CLI delegates to `install.sh` with the resolved target directory. This was missing from 0.1.0, making the package unusable via `npx`.

---

## [0.1.0] — 2026-04-20

Initial release of the Material UI overlay for `@specwright/plugin`.

### Added

#### `e2e-tests/utils/stepHelpers.js` — MUI FIELD_TYPES

Five new interaction types for Material UI components:

- **`MUI_SELECT`** — Opens the MUI Select Portal listbox (click root → wait for `role="listbox"` → click option). Replaces `page.selectOption()` which does not work with MUI Select.
- **`MUI_AUTOCOMPLETE`** — Fills the combobox input and clicks the matching option. Handles both option-list and freeform (`freeSolo`) autocomplete inputs.
- **`MUI_DATE_PICKER`** — Types directly into the masked date input in `MM/DD/YYYY` format. Avoids calendar picker interaction which is fragile in automation.
- **`MUI_CHECKBOX`** — Clicks the native `<input type="checkbox">` targeted via `inputProps` `data-testid`. Supports checked state assertions.
- **`MUI_DIALOG_CONFIRM`** — Waits for the MUI Dialog Portal (`role="dialog"`), clicks the confirm button, waits for the dialog to close.

Two new validation types:

- **`MUI_SELECT_VALUE`** — Asserts the selected value text inside the MUI Select root element (`toContainText`).
- **`MUI_TEXT_VISIBLE`** — Asserts visible text on any element by testId (used for Chip / Badge content).

#### `e2e-tests/playwright/auth-strategies/email-password.js` — Single-form login

Replaces the base plugin's two-step (email → continue → password) auth strategy with a single-form flow where both fields are visible simultaneously. After submit, waits for URL to match `/todos`, `/home`, or `/dashboard`. Reads credentials from `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` env vars; reads locators from `authenticationData.js`.

#### `.claude/agents/playwright/code-generator.md` — MUI v6 component patterns

Complete code-generator agent override with 10 sections covering all MUI component types:

1. MUI TextField — `slotProps.htmlInput` testid placement, `FIELD_TYPES.FILL`
2. MUI Select — Portal listbox pattern, never use `selectOption()`
3. MUI Autocomplete — combobox fill + option click, freeform Tab-to-confirm
4. MUI X DatePicker — direct date field typing, `AdapterDateFnsV3`
5. MUI Checkbox — `inputProps` testid, checked state assertion
6. MUI Dialog — `getByRole('dialog')` for Portal, no testid on wrapper
7. MUI Snackbar / Alert — `role="alert"` assertion immediately after action
8. MUI Tabs — `aria-selected` attribute assertion
9. MUI Chip / Badge — text content assertion via testId
10. Never use MUI class names (`MuiButton-root` etc.) as selectors

Includes a complete known-selector reference for the todo-app example project (sign-in, todo list, create todo, delete dialog testIds).

#### `.claude/rules/dependencies.md` — MUI dependency reference

Import patterns and E2E notes for:

- `@mui/material` v6 — key behaviours (Portal rendering, role attributes, no class selectors)
- `@mui/x-date-pickers` v7 — `AdapterDateFnsV3` for date-fns v3 compatibility
- `zustand` v5 — `persist` middleware, localStorage key conventions
- `react-router-dom` v6 — route structure

#### `specwright.plugin.json` — Overlay manifest

Declares this package as a Specwright overlay extending `@specwright/plugin >=0.3.7`.
