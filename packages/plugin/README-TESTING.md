# E2E Testing Framework

## Overview

**playwright-bdd** (v8+) BDD-style end-to-end testing with AI-powered test generation and self-healing.

- Gherkin `.feature` files compiled to Playwright specs via `bddgen`
- Path-based tag scoping for module isolation
- Default parallel execution, `@serial-execution` opt-out with browser reuse
- 3-layer test data persistence (`page.testData` → `featureDataCache` → scoped JSON)
- `processDataTable` / `validateExpectations` utilities for declarative form handling
- 8 AI agents + 7 Claude Code skills for automated test generation and healing

## Quick Start

```bash
# 1. Install dependencies + Playwright browsers
pnpm install && pnpx playwright install

# 2. Set credentials in .env
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password

# 3. Start dev server
pnpm dev

# 4. Run authentication tests (out-of-the-box)
pnpm test:bdd:auth

# 5. View report
pnpm report:playwright
```

**Never run `npx playwright test` directly** — it skips `bddgen` and uses stale specs.

## Project Configuration

| Project            | Purpose               | Behavior                                                 |
| ------------------ | --------------------- | -------------------------------------------------------- |
| `setup`            | Auth session creation | Runs first, creates auth session                         |
| `auth-tests`       | Login/logout tests    | Clean browser state, no storageState                     |
| `serial-execution` | Stateful features     | `@serial-execution` tag, workers: 1, browser reused      |
| `main-e2e`         | Everything else       | `fullyParallel: true` (default), storageState from setup |

## Directory Structure

```
e2e-tests/
├── features/playwright-bdd/
│   ├── @Modules/                   ← Single-module tests
│   │   └── @Authentication/        ← Out-of-the-box auth tests (7 scenarios)
│   ├── @Workflows/                 ← Cross-module workflow tests
│   │   └── @YourWorkflow/          ← Precondition → consumers pattern
│   │       ├── @0-Precondition/    ← Serial, creates shared data
│   │       ├── @1-Consumer/        ← Loads predata, runs in parallel
│   │       └── @2-Consumer/
│   └── shared/                     ← Globally scoped steps (no @ prefix)
│       ├── auth.steps.js
│       ├── navigation.steps.js
│       ├── common.steps.js
│       └── global-hooks.js         ← Auto-loaded, NEVER import manually
├── playwright/
│   ├── fixtures.js                 ← Custom fixtures + browser reuse (import from HERE)
│   ├── auth.setup.js               ← Two-step localStorage login
│   ├── auth-storage/.auth/         ← Saved auth state (gitignored)
│   ├── generated/                  ← Seed files from exploration
│   └── test-data/                  ← Scoped JSON files (auto-created)
├── utils/
│   ├── stepHelpers.js              ← processDataTable, validateExpectations, FIELD_TYPES
│   └── testDataGenerator.js        ← Faker-based value generation
├── data/
│   ├── authenticationData.js       ← Credentials from env vars (never hardcoded)
│   └── testConfig.js               ← Routes, timeouts, baseUrl
├── instructions.js                 ← Agent pipeline config (add your entries)
├── instructions.example.js         ← Example configs (text, Jira, CSV, workflow)
└── .env.testing                    ← Environment variable template
```

## Running Tests

```bash
## Predefined scripts
pnpm test:bdd               # All tests except auth
pnpm test:bdd:all            # Everything including auth
pnpm test:bdd:auth           # Authentication tests only
pnpm test:bdd:serial         # Serial execution tests only
pnpm test:bdd:debug          # Debug mode (PWDEBUG)

## Run by tag
pnpm bddgen && npx playwright test --project setup --project main-e2e --grep @your-tag
pnpm bddgen && npx playwright test --project setup --project serial-execution --grep @your-serial-tag

## Run by file
pnpm bddgen && npx playwright test --project setup --project main-e2e \
  ".features-gen/e2e-tests/features/playwright-bdd/@Modules/@YourModule/feature.spec.js"

## Run headed
pnpm bddgen && npx playwright test --project setup --project main-e2e --grep @tag --headed

## Run single scenario by title
pnpm bddgen && npx playwright test --project setup --project main-e2e -g "Scenario title"

## Reports
pnpm report:playwright       # View HTML report
pnpm test:clean              # Clean reports + .features-gen + test-data
```

**Tip:** Use `--project serial-execution` for `@serial-execution` features, `--project auth-tests` for `@Authentication`, `--project main-e2e` for everything else.

## Modules vs Workflows

Specwright organizes tests into two categories: **Modules** and **Workflows**. Choosing the right one determines how your tests are scoped, isolated, and executed.

### Modules (`@Modules/`)

A Module tests a **single page or feature area** of your application in isolation.

**When to use:**
- Testing one page's UI (e.g., HomePage, UserProfile, Settings)
- Testing a self-contained feature (e.g., Authentication, Search, Notifications)
- Scenarios are independent — each can run without the others
- No shared state between scenarios (or state shared only within the same feature file via `@serial-execution`)

**Examples:**
- `@Modules/@HomePage/` — year tabs, pagination, show cards, search
- `@Modules/@Authentication/` — sign in, sign out, protected routes
- `@Modules/@UserProfile/` — edit name, change avatar, delete account

**Structure:**
```
@Modules/
├── @HomePage/
│   ├── homepage.feature      ← Gherkin scenarios for the home page
│   └── steps.js              ← Step definitions (scoped to @HomePage only)
├── @Authentication/
│   ├── authentication.feature
│   └── steps.js
└── @Settings/
    ├── settings.feature
    └── steps.js
```

**Key rules:**
- Each module gets its own directory under `@Modules/`
- Steps in `@Modules/@HomePage/steps.js` are **only visible** to features inside `@HomePage/` (path-based tag scoping)
- If a step is needed by multiple modules, move it to `shared/`
- Modules run in **parallel by default** — add `@serial-execution` only if scenarios share state

### Workflows (`@Workflows/`)

A Workflow tests a **cross-module user journey** that spans multiple pages or features with shared data.

**When to use:**
- Testing an end-to-end user journey across multiple pages
- Scenario B depends on data created by Scenario A (e.g., "create a list" then "add items to that list")
- Data must survive across feature files (not just scenarios within one file)
- The flow mimics a real user session: sign in → do something → verify elsewhere

**Examples:**
- Sign in → create a watchlist → add shows → verify on favorites page
- Register → set up profile → invite team member → verify invite received
- Create order → process payment → check confirmation → verify email

**Structure:**
```
@Workflows/
└── @UserJourney/
    ├── @0-Precondition/          ← Runs FIRST (serial), creates shared data
    │   ├── setup.feature         ← @precondition @cross-feature-data @serial-execution
    │   └── steps.js
    ├── @1-VerifyFavorites/       ← Runs AFTER precondition, loads shared data
    │   ├── verify.feature        ← @workflow-consumer
    │   └── steps.js
    └── @2-VerifyLists/
        ├── verify.feature
        └── steps.js
```

**Key rules:**
- Precondition directories start with `@0-` and use `@serial-execution` + `@precondition` + `@cross-feature-data` tags
- Consumer directories start with `@1-`, `@2-`, etc. and use `@workflow-consumer` tag
- Consumers load shared data with: `Given I load predata from "workflow-name"`
- Data flows via the 3-layer persistence: `page.testData` → `featureDataCache` → scoped JSON files
- Steps that touch multiple modules **must** live in `shared/`, not inside `@`-prefixed directories

### Quick Decision Guide

| Question | Module | Workflow |
|----------|--------|----------|
| Tests one page/feature? | Yes | No |
| Tests a multi-page user journey? | No | Yes |
| Scenarios are independent? | Yes | Not always |
| Needs data from another feature file? | No | Yes |
| Can run in any order? | Yes | No (precondition → consumers) |
| Default execution | Parallel | Precondition serial, consumers parallel |

### Configuring in `instructions.js`

```javascript
// Module — single page
{
  moduleName: 'HomePage',
  category: '@Modules',
  pageURL: 'http://localhost:5173',
  // ...
}

// Workflow — cross-module journey
{
  moduleName: 'UserJourney',
  category: '@Workflows',
  pageURL: 'http://localhost:5173',
  // ...
}
```

The `category` field determines where the generated files are placed: `@Modules/@HomePage/` or `@Workflows/@UserJourney/`.

---

## Writing Tests

### Feature Files

```gherkin
@module-name
Feature: Module Description
  Background:
    Given I am logged in
    When I navigate to "PageName"

  Scenario: Happy path
    When I fill the form with:
      | Field Name | Value           | Type            |
      | Name       | <gen_test_data> | SharedGenerated |
      | Email      | <gen_test_data> | SharedGenerated |
    And I click the submit button
    Then I should see the success message
```

### Step Definitions (with processDataTable)

```javascript
import { When, Then, expect } from '../../../../playwright/fixtures.js';
import { FIELD_TYPES, processDataTable, validateExpectations } from '../../../../utils/stepHelpers.js';

const FIELD_CONFIG = {
  Name: { type: FIELD_TYPES.FILL, testID: 'user-name' },
  Email: { type: FIELD_TYPES.FILL, testID: 'user-email' },
};

const VALIDATION_CONFIG = {
  Name: { type: FIELD_TYPES.TEXT_VISIBLE, testID: 'display-name' },
  Email: { type: FIELD_TYPES.TEXT_VISIBLE, testID: 'display-email' },
};

const fieldMapping = { Name: 'name', Email: 'email' };

When('I fill the form with:', async ({ page }, dataTable) => {
  await processDataTable(page, dataTable, { mapping: fieldMapping, fieldConfig: FIELD_CONFIG });
});

Then('I should see the details:', async ({ page }, dataTable) => {
  await validateExpectations(page, dataTable, { mapping: fieldMapping, validationConfig: VALIDATION_CONFIG });
});
```

### Data Table Placeholders

| Placeholder        | Used in         | Meaning                        |
| ------------------ | --------------- | ------------------------------ |
| `<gen_test_data>`  | Form fill steps | Generate faker value, cache it |
| `<from_test_data>` | Assertion steps | Read cached value              |
| Static value       | Both            | Use as-is                      |

### When to Use `@serial-execution`

Add when:

- `<gen_test_data>` in Scenario A and `<from_test_data>` in Scenario B
- Scenarios rely on UI state from previous scenarios
- Workflow precondition/consumer pattern

No tag needed (parallel by default) when:

- Each scenario is self-contained
- Scenarios only READ predata independently

### Adding a New Module

1. Create: `e2e-tests/features/playwright-bdd/@Modules/@YourModule/`
2. Add: `your-feature.feature` + `steps.js`
3. Import: `import { When, Then } from '../../../../playwright/fixtures.js'`
4. For data tables: `import { FIELD_TYPES, processDataTable } from '../../../../utils/stepHelpers.js'`
5. Run: `pnpm test:bdd`

### Adding a Workflow

1. Create: `e2e-tests/features/playwright-bdd/@Workflows/@YourWorkflow/`
2. `@0-Precondition/` — serial, creates data (`@precondition @cross-feature-data @serial-execution`)
3. `@1-Consumer/` — loads predata via `Given I load predata from "workflow-name"` (`@workflow-consumer`)

## Agent Pipeline

| Command                | What it does                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| `/e2e-automate`        | Full 10-phase pipeline: config → explore → plan → approve → generate → execute |
| `/e2e-plan <page>`     | Explore a page, discover selectors, generate test plan                         |
| `/e2e-generate <plan>` | Generate .feature + steps.js from a plan                                       |
| `/e2e-heal`            | Run tests, diagnose failures, auto-heal                                        |
| `/e2e-run`             | Quick test execution with optional filters                                     |
| `/e2e-validate`        | Validate seed file tests before BDD generation                                 |
| `/e2e-process <input>` | Process Jira/files into test plan markdown                                     |

Configure in `e2e-tests/instructions.js` (see `instructions.example.js` for examples).

## Troubleshooting

| Problem                              | Fix                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------- |
| "Step not found" after editing steps | `rm -rf .features-gen/ && pnpm test:bdd`                                   |
| Auth failures                        | `rm -f e2e-tests/playwright/auth-storage/.auth/user.json && pnpm test:bdd` |
| Cross-module steps not visible       | Move from `@Module/steps.js` to `shared/`                                  |
| Duplicate hook errors                | Never import `global-hooks.js` manually                                    |
| Browser launch failures              | `pnpx playwright install`                                                  |

## Environment Variables

| Variable                 | Default                 | Description               |
| ------------------------ | ----------------------- | ------------------------- |
| `BASE_URL`               | `http://localhost:5173` | Application URL           |
| `TEST_USER_EMAIL`        | —                       | Login email (required)    |
| `TEST_USER_PASSWORD`     | —                       | Login password (required) |
| `HEADLESS`               | `true`                  | Headless browser mode     |
| `TEST_TIMEOUT`           | `90000`                 | Test timeout (ms)         |
| `ENABLE_SCREENSHOTS`     | `true`                  | Screenshot on failure     |
| `ENABLE_VIDEO_RECORDING` | `false`                 | Video on failure          |
| `ENABLE_TRACING`         | `false`                 | Playwright traces         |
