# @specwright/plugin

AI-powered E2E test automation framework. Drop into any web app — get Playwright BDD tests, Claude Code agents, and self-healing test execution.

[![npm version](https://img.shields.io/npm/v/@specwright/plugin.svg)](https://www.npmjs.com/package/@specwright/plugin)
[![license](https://img.shields.io/npm/l/@specwright/plugin.svg)](https://github.com/SanthoshDhandapani/specwright/blob/main/LICENSE)

## Install

```bash
npx @specwright/plugin init
```

Then:

```bash
pnpm install                  # Install dependencies
npx playwright install        # Install browsers
pnpm test:bdd:auth            # Verify setup (runs 7 auth tests)
```

## What You Get

```
your-project/
├── playwright.config.ts           Multi-project BDD configuration
├── e2e-tests/
│   ├── instructions.js            Pipeline config (your test definitions)
│   ├── instructions.example.js    Example configs (text, Jira, CSV, workflow)
│   ├── playwright/
│   │   ├── fixtures.js            Custom test fixtures (Given/When/Then/Before/After)
│   │   ├── auth.setup.js          Authentication state creation
│   │   ├── global.setup.js        Cleanup marker strategy
│   │   └── generated/seed.spec.js Validated selectors from exploration
│   ├── features/playwright-bdd/
│   │   ├── @Modules/              Single-module test features
│   │   │   └── @Authentication/   Pre-built auth tests (7 scenarios)
│   │   ├── @Workflows/            Cross-module workflow tests
│   │   └── shared/                Global step definitions
│   ├── utils/
│   │   ├── stepHelpers.js         processDataTable + validateExpectations
│   │   └── testDataGenerator.js   Faker-based data generation
│   └── data/
│       ├── authenticationData.js  Login form locators + credentials
│       └── testConfig.js          Routes, timeouts, base URL
└── .claude/
    ├── agents/                    8 AI agent system prompts
    ├── skills/                    7 Claude Code skills (/e2e-automate, etc.)
    └── rules/                     Architecture + conventions docs
```

## Quick Start

### 1. Configure Authentication

Update `e2e-tests/data/authenticationData.js` to match your app's login form:

```javascript
locators: {
  emailInput: { testId: 'your-email-input' },
  emailSubmitButton: { testId: 'your-submit-button' },
  passwordInput: { testId: 'your-password-input' },
  loginSubmitButton: { testId: 'your-login-button' },
}
```

### 2. Configure Routes

Update `e2e-tests/data/testConfig.js`:

```javascript
routes: {
  Home: '/',
  Dashboard: '/dashboard',
  SignIn: '/signin',
}
```

### 3. Set Environment Variables

```bash
# .env
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password
HEADLESS=true
```

### 4. Run Tests

```bash
pnpm test:bdd              # All tests
pnpm test:bdd:auth         # Authentication tests only
pnpm test:bdd:debug        # Debug mode
pnpm report:playwright     # View HTML report
```

## Generate Tests with AI

### Option 1: Full Pipeline

```bash
# Configure what to test
cp e2e-tests/instructions.example.js e2e-tests/instructions.js
# Edit instructions.js with your pages and test descriptions

# Run the 10-phase pipeline
claude
/e2e-automate
```

### Option 2: Step by Step

```bash
/e2e-plan /dashboard       # Explore a page, discover selectors
/e2e-generate plan.md      # Generate .feature + steps.js
/e2e-heal                  # Auto-fix failing tests
/e2e-run                   # Execute tests
```

### Option 3: Specwright Desktop App

Use the [Specwright desktop app](https://github.com/SanthoshDhandapani/specwright) for a visual UI — configure tests, see real-time progress, approve plans before generation.

## The 10-Phase Pipeline

```
Phase 1:  Read Config           instructions.js
Phase 2:  Detect & Route        Jira / File / Text input
Phase 3:  Process Input         Convert to parsed test plan
Phase 4:  Explore App           Playwright browser exploration
Phase 5:  Validate Seeds        Run discovered selectors (optional)
Phase 6:  User Approval         Review plan before generation
Phase 7:  Generate BDD          Create .feature + steps.js
Phase 8:  Execute & Heal        Run tests + auto-fix failures
Phase 9:  Cleanup               Aggregate results
Phase 10: Quality Review        Score (0-100) + summary
```

## Key Features

### Playwright BDD

Gherkin `.feature` files compiled to Playwright specs via [playwright-bdd](https://github.com/nicolo-ribaudo/playwright-bdd). Write tests in natural language:

```gherkin
@authentication @smoke
Feature: User Authentication

  Scenario: Successful login flow
    Given I navigate to "Sign In"
    When I enter my email "user@example.com"
    And I click the proceed button
    And I enter my password
    And I click the login button
    Then I should be redirected to the home page
```

### 8 AI Agents

| Agent | Purpose |
|-------|---------|
| `input-processor` | Convert Jira/Excel/CSV/text to test plans |
| `jira-processor` | Fetch and parse Jira tickets |
| `playwright-test-planner` | Explore apps, discover selectors |
| `bdd-generator` | Create .feature files + step skeletons |
| `code-generator` | Fill in Playwright implementation code |
| `execution-manager` | Run tests, investigate source code |
| `playwright-test-healer` | Auto-fix failing tests |
| `playwright-test-generator` | Direct Playwright code generation |

### 3-Layer Data Persistence

```
Layer 1: page.testData           Scenario-scoped (cleared each scenario)
Layer 2: featureDataCache        In-memory (survives scenario boundaries)
Layer 3: test-data/{scope}.json  File-backed (survives worker restarts)
```

### processDataTable

Declarative form filling with `<gen_test_data>` (faker generation) and `<from_test_data>` (cache reading):

```gherkin
When I fill the form with:
  | Field Name | Value           | Type            |
  | Name       | <gen_test_data> | SharedGenerated |
  | Email      | <gen_test_data> | SharedGenerated |
  | Phone      | <gen_test_data> | SharedGenerated |
```

### Cross-Module Workflows

Precondition features create shared data, consumer features use it:

```
@Workflows/@UserJourney/
├── @0-Precondition/    Create test data (serial, runs first)
├── @1-Favorites/       Consumer (parallel, loads precondition data)
└── @2-Watchlist/       Consumer (parallel, loads precondition data)
```

## Instructions Format

`e2e-tests/instructions.js` defines what to test:

```javascript
export default [
  {
    moduleName: '@Dashboard',
    category: '@Modules',
    fileName: 'dashboard',
    pageURL: 'http://localhost:5173/dashboard',
    instructions: [
      'Navigate to the dashboard',
      'Verify summary cards are displayed',
      'Click on a card and verify detail view',
    ],
    explore: true,
    autoApprove: false,       // skip Phase 6 approval and generate immediately
    runExploredCases: false,
    runGeneratedCases: false,
  },
];
```

| Field | Type | Description |
|---|---|---|
| `moduleName` | string | Target module tag (e.g. `@Dashboard`) |
| `category` | string | `@Modules` (default) or `@Workflows` |
| `subModuleName` | string[] | Sub-phase tags for workflows (e.g. `['@0-Setup', '@1-Verify']`) |
| `fileName` | string | Output filename stem (e.g. `dashboard` → `dashboard.feature`) |
| `pageURL` | string | App URL for browser exploration. Required when `explore: true` |
| `filePath` | string | Source file for data-driven generation (CSV, Excel, PDF, JSON) |
| `instructions` | string[] | Free-text descriptions of what to test |
| `explore` | boolean | Run live browser exploration to discover selectors (Phase 4) |
| `autoApprove` | boolean | Skip the Phase 6 approval prompt and proceed to generation automatically. Useful for CI or trusted runs. Default: `false` |
| `runExploredCases` | boolean | Run explored seed tests before BDD generation (Phase 5) |
| `runGeneratedCases` | boolean | Run generated BDD tests after creation (Phase 8) |

## Prerequisites

- **Node.js** 20+
- **pnpm** (or npm/yarn)
- **Claude Code CLI** — [Get it here](https://claude.ai/code)

## Options

```bash
# Install with authentication module (default)
npx @specwright/plugin init

# Skip authentication module
npx @specwright/plugin init --skip-auth

# Install to a specific directory
npx @specwright/plugin init /path/to/project
```

## Links

- [GitHub Repository](https://github.com/SanthoshDhandapani/specwright)
- [Desktop App](https://github.com/SanthoshDhandapani/specwright/tree/main/apps/desktop)
- [ShowBuff Demo App](https://github.com/SanthoshDhandapani/specwright/tree/main/apps/examples/show-buff)
- [Plugin Documentation](https://github.com/SanthoshDhandapani/specwright/blob/main/packages/plugin/PLUGIN.md)
- [Testing Guide](https://github.com/SanthoshDhandapani/specwright/blob/main/packages/plugin/README-TESTING.md)

## License

MIT
