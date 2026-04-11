# E2E Testing Framework — Show-Buff

## Overview

**playwright-bdd** (v8+) BDD-style end-to-end testing with AI-powered test generation and self-healing.

- Gherkin `.feature` files compiled to Playwright specs via `bddgen`
- Path-based tag scoping for module isolation
- Default parallel execution, `@serial-execution` opt-out with browser reuse
- Workflow support: `precondition → workflow-consumers` pattern with 3-layer data persistence
- `processDataTable` / `validateExpectations` utilities for declarative form handling
- 8 AI agents + 7 Claude Code skills for automated test generation and healing
- Auth strategy: OAuth via localStorage injection (`OAUTH_STORAGE_KEY`)

## Quick Start

```bash
# 1. Install dependencies + Playwright browsers
pnpm install && pnpx playwright install

# 2. Configure auth in e2e-tests/.env.testing
AUTH_STRATEGY=oauth
TEST_USER_EMAIL=your-email@example.com
OAUTH_STORAGE_KEY=specwright-show-user   # localStorage key Show-Buff uses for auth

# 3. Start dev server
pnpm dev

# 4. Run BDD tests
pnpm test:bdd

# 5. View report
pnpm report:playwright
```

**Never run `npx playwright test` directly** — it skips `bddgen` and uses stale specs.

## Project Configuration

| Project              | Purpose                    | Behavior                                                           |
| -------------------- | -------------------------- | ------------------------------------------------------------------ |
| `setup`              | Auth session creation       | Runs first, injects OAuth user into localStorage                   |
| `auth-tests`         | Login/logout tests          | Clean browser state, no storageState                               |
| `serial-execution`   | Stateful features           | `@serial-execution` tag, workers: 1, browser reused across scenarios |
| `precondition`       | Workflow setup              | `@precondition` tag, serial (workers: 1), runs before consumers    |
| `workflow-consumers` | Workflow verification       | `@workflow-consumer` tag, parallel, depends on `precondition`      |
| `run-workflow`       | Single workflow (targeted)  | All `@Workflows/**`, serial filesystem order — use with `--grep`   |
| `main-e2e`           | All other module tests      | `fullyParallel: true` (default), storageState from setup           |

## Directory Structure

```
e2e-tests/
├── features/playwright-bdd/
│   ├── @Modules/                   ← Single-module tests
│   │   ├── @HomePage/              ← Year tabs, pagination, show cards
│   │   ├── @ShowDetail/            ← Show info, favorites, watchlist, lists
│   │   ├── @Favorites/             ← Favorites page
│   │   ├── @Watchlist/             ← Watchlist page
│   │   ├── @Lists/                 ← Custom lists management
│   │   └── @ListDetail/            ← List detail, rename, delete
│   ├── @Workflows/                 ← Cross-module workflow tests
│   │   └── @YourWorkflow/
│   │       ├── @0-Precondition/    ← Serial, creates shared data (@precondition)
│   │       ├── @1-Consumer/        ← Loads predata, runs parallel (@workflow-consumer)
│   │       └── @2-Consumer/
│   └── shared/                     ← Globally scoped steps (no @ prefix)
│       ├── auth.steps.js
│       ├── navigation.steps.js
│       ├── common.steps.js
│       └── global-hooks.js         ← Auto-loaded, NEVER import manually
├── playwright/
│   ├── fixtures.js                 ← Custom fixtures + browser reuse (import from HERE)
│   ├── auth.setup.js               ← Reads AUTH_STRATEGY, delegates to oauth.js
│   ├── auth-strategies/
│   │   └── oauth.js                ← Injects user object into localStorage
│   ├── auth-storage/.auth/         ← Saved auth state (gitignored)
│   ├── generated/                  ← Seed files from exploration
│   └── test-data/                  ← Scoped JSON files (auto-created)
├── utils/
│   ├── stepHelpers.js              ← processDataTable, validateExpectations, FIELD_TYPES
│   └── testDataGenerator.js        ← Faker-based value generation
├── data/
│   ├── authenticationData.js       ← Credentials from env vars (never hardcoded)
│   └── testConfig.js               ← Routes, timeouts, baseUrl
├── scripts/
│   └── generate-bdd-report.js      ← Generates HTML cucumber report
├── instructions.js                 ← Agent pipeline config (add your entries)
└── .env.testing                    ← Environment variable template
```

## Running Tests

```bash
## Predefined scripts
pnpm test:bdd               # Full suite: modules + workflows (recommended)
pnpm test:bdd:all           # Everything including auth tests
pnpm test:bdd:auth          # Authentication tests only
pnpm test:bdd:serial        # Serial execution features only
pnpm test:bdd:workflows     # All workflows only (precondition → consumers)
pnpm test:bdd:workflow      # Single targeted workflow (pair with --grep)
pnpm test:bdd:debug         # Debug mode (PWDEBUG)

## Run by tag
pnpm bddgen && npx playwright test --project setup --project main-e2e --grep @homepage
pnpm bddgen && npx playwright test --project setup --project serial-execution --grep @show-detail

## Run a specific workflow
pnpm bddgen && npx playwright test --project setup --project run-workflow --grep @FavoritesWorkflow

## Run by file
pnpm bddgen && npx playwright test --project setup --project main-e2e \
  ".features-gen/e2e-tests/features/playwright-bdd/@Modules/@HomePage/homepage.spec.js"

## Run headed
pnpm bddgen && npx playwright test --project setup --project main-e2e --grep @homepage --headed

## Run single scenario by title
pnpm bddgen && npx playwright test --project setup --project main-e2e -g "Scenario title"

## Reports
pnpm report:playwright       # View HTML report
pnpm report:bdd              # Generate BDD cucumber HTML report
pnpm report:bdd:open         # Open BDD report in browser
pnpm test:clean              # Clean reports + .features-gen + test-data
```

**Project routing tip:**
- `@serial-execution` features → `--project serial-execution`
- `@Authentication` features → `--project auth-tests`
- `@precondition` features → `--project precondition`
- `@workflow-consumer` features → `--project workflow-consumers`
- Everything else → `--project main-e2e`

## Modules vs Workflows

Specwright organizes tests into two categories: **Modules** and **Workflows**. Choosing the right one determines how your tests are scoped, isolated, and executed.

### Modules (`@Modules/`)

A Module tests a **single page or feature area** of the application in isolation.

**Show-Buff modules:**
- `@Modules/@HomePage/` — year tabs, pagination, show cards, navigation
- `@Modules/@ShowDetail/` — show info, add/remove favorites, watchlist, custom lists
- `@Modules/@Favorites/` — favorites grid, empty state, count badge
- `@Modules/@Watchlist/` — watchlist grid, empty state, count badge
- `@Modules/@Lists/` — create list, validation, list card grid
- `@Modules/@ListDetail/` — rename, delete, add/remove shows

**Structure:**
```
@Modules/
├── @HomePage/
│   ├── homepage.feature      ← Gherkin scenarios for the home page
│   └── steps.js              ← Step definitions (scoped to @HomePage only)
├── @ShowDetail/
│   ├── show_detail.feature
│   └── steps.js
└── @Favorites/
    ├── favorites.feature
    └── steps.js
```

**Key rules:**
- Steps in `@Modules/@HomePage/steps.js` are **only visible** to features inside `@HomePage/` (path-based tag scoping)
- If a step is needed by multiple modules, move it to `shared/`
- Modules run in **parallel by default** — add `@serial-execution` only if scenarios share state

### Workflows (`@Workflows/`)

A Workflow tests a **cross-module user journey** with shared data flowing between feature files.

**Show-Buff workflow examples:**
- Add show to favorites → verify on favorites page (`@FavoritesWorkflow`)
- Create custom list → add shows → verify list detail (`@ListWorkflow`)

**Structure:**
```
@Workflows/
└── @FavoritesWorkflow/
    ├── @0-Precondition/          ← Runs FIRST (serial), creates shared data
    │   ├── setup.feature         ← @precondition @cross-feature-data @serial-execution
    │   └── steps.js
    └── @1-VerifyFavorites/       ← Runs AFTER precondition, loads shared data
        ├── verify.feature        ← @workflow-consumer
        └── steps.js
```

**Key rules:**
- Precondition directories start with `@0-` and use `@serial-execution` + `@precondition` + `@cross-feature-data` tags
- Consumer directories start with `@1-`, `@2-`, etc. and use `@workflow-consumer` tag
- Consumers load shared data with: `Given I load predata from "workflow-name"`
- Data flows via 3-layer persistence: `page.testData` → `featureDataCache` → scoped JSON files
- Steps that touch multiple modules **must** live in `shared/`, not inside `@`-prefixed directories

**Running workflows:**
```bash
pnpm test:bdd:workflows                             # All workflows
pnpm test:bdd:workflow --grep @FavoritesWorkflow    # Single workflow
```

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
  moduleName: '@HomePage',
  category: '@Modules',
  fileName: 'homepage',
  pageURL: '/home',
  explore: true,
}

// Workflow — cross-module journey
{
  moduleName: '@FavoritesWorkflow',
  category: '@Workflows',
  subModuleName: ['@0-Precondition', '@1-VerifyFavorites'],
  fileName: 'favorites_workflow',
  pageURL: '/home',
  explore: true,
}
```

See `demo/instructions.example.js` for the full Show-Buff example with all 6 modules and 2 workflows.

---

## Writing Tests

### Feature Files

```gherkin
@homepage @navigation
Feature: Home Page Navigation
  Background:
    Given I am logged in
    When I navigate to "HomePage"

  Scenario: Year tabs filter show grid
    When I click the year tab for the previous year
    Then the show grid should reload with shows from that year
```

### Step Definitions (with processDataTable)

```javascript
import { When, Then, expect } from '../../../../playwright/fixtures.js';
import { FIELD_TYPES, processDataTable, validateExpectations } from '../../../../utils/stepHelpers.js';

const FIELD_CONFIG = {
  'List Name': { type: FIELD_TYPES.FILL, testID: 'create-list-input' },
};

const fieldMapping = { 'List Name': 'listName' };

When('I create a list with:', async ({ page }, dataTable) => {
  await processDataTable(page, dataTable, { mapping: fieldMapping, fieldConfig: FIELD_CONFIG });
  await page.getByTestId('create-list-submit').click();
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
4. Run: `pnpm test:bdd:workflows` or `pnpm test:bdd:workflow --grep @YourWorkflow`

## Auth Strategy — OAuth (localStorage Injection)

Show-Buff uses Google OAuth. The test suite bypasses the real OAuth popup by injecting a pre-built user object directly into `localStorage` under `OAUTH_STORAGE_KEY`.

```
# e2e-tests/.env.testing
AUTH_STRATEGY=oauth
TEST_USER_EMAIL=your-email@example.com
OAUTH_STORAGE_KEY=specwright-show-user
TEST_USER_NAME=Your Name              # optional — derived from email if blank
TEST_USER_PICTURE=                    # optional — auto SVG initials if blank
```

To regenerate the auth session:
```bash
rm -f e2e-tests/playwright/auth-storage/.auth/user.json && pnpm test:bdd
```

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

Configure in `e2e-tests/instructions.js`. See `demo/instructions.example.js` for Show-Buff specific examples with all selectors pre-documented.

## Troubleshooting

| Problem                              | Fix                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------- |
| "Step not found" after editing steps | `rm -rf .features-gen/ && pnpm test:bdd`                                   |
| Auth failures / stale session        | `rm -f e2e-tests/playwright/auth-storage/.auth/user.json && pnpm test:bdd` |
| Cross-module steps not visible       | Move from `@Module/steps.js` to `shared/`                                  |
| Duplicate hook errors                | Never import `global-hooks.js` manually                                    |
| Browser launch failures              | `pnpx playwright install`                                                  |
| Workflow consumers run before precondition | Ensure `@precondition` tag is present on setup feature              |
| OAuth user not injected              | Check `OAUTH_STORAGE_KEY` matches the key Show-Buff reads from localStorage |

## Environment Variables

| Variable                 | Default                 | Description                                               |
| ------------------------ | ----------------------- | --------------------------------------------------------- |
| `BASE_URL`               | `http://localhost:5173` | Application URL                                           |
| `AUTH_STRATEGY`          | `oauth`                 | Auth mode — Show-Buff uses `oauth`                        |
| `TEST_USER_EMAIL`        | —                       | Google account email for the test user                    |
| `OAUTH_STORAGE_KEY`      | `specwright-show-user`  | localStorage key Show-Buff reads auth from                |
| `TEST_USER_NAME`         | derived from email      | Display name for the injected user object                 |
| `TEST_USER_PICTURE`      | auto SVG initials       | Avatar URL for the injected user object                   |
| `OAUTH_SIGNIN_PATH`      | `/signin`               | Sign-in page path (click-based fallback)                  |
| `OAUTH_BUTTON_TEST_ID`   | —                       | Sign-in button testId (click-based fallback)              |
| `PIPELINE_TICKET_ID`     | —                       | Jira ticket ID prepended to all pipeline runs             |
| `HEADLESS`               | `true`                  | Headless browser mode                                     |
| `TEST_TIMEOUT`           | `90000`                 | Test timeout (ms)                                         |
| `ENABLE_SCREENSHOTS`     | `true`                  | Screenshot on failure                                     |
| `ENABLE_VIDEO_RECORDING` | `false`                 | Video on failure                                          |
| `ENABLE_TRACING`         | `false`                 | Playwright traces                                         |
