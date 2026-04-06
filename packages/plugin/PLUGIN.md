# E2E Automation Plugin

Drop-in E2E test automation framework with AI-powered test generation, execution, and self-healing.

Built on **playwright-bdd** (Gherkin BDD) + **Claude Code agents** (8 agents, 7 skills).

## What You Get

- **Playwright BDD framework** — Gherkin `.feature` files compiled to Playwright specs
- **8 AI agents** — explore apps, generate tests, fix failures, process Jira tickets
- **7 Claude Code skills** — `/e2e-automate`, `/e2e-plan`, `/e2e-generate`, `/e2e-heal`, `/e2e-validate`, `/e2e-process`, `/e2e-run`
- **Shared step library** — auth, navigation, common assertions, global hooks
- **processDataTable utility** — declarative form filling with `FIELD_TYPES` and faker data generation
- **3-layer data persistence** — scenario → in-memory cache → scoped JSON files
- **Feature-level browser reuse** — `@serial-execution` shares browser across scenarios

## Prerequisites

- Node.js 18+, pnpm
- Claude Code CLI
- MCP servers: `playwright-mcp`, `markitdown` (optional), `atlassian` (optional for Jira)

## Installation

### Quick Install

```bash
# From your project root (includes authentication tests):
bash path/to/e2e-plugin/install.sh

# Skip authentication module if your app doesn't have sign-in:
bash path/to/e2e-plugin/install.sh --skip-auth
```

### Manual Install

1. Copy `.claude/` contents to your project root (agents, skills, rules, memory)
2. Copy `e2e-tests/` contents to your project root (fixtures, shared steps, utils)
3. Copy `playwright.config.ts` to your project root
4. Merge `package.json.snippet` devDependencies and scripts into your `package.json`
5. Append `.gitignore.snippet` lines to your `.gitignore`

### Post-Install

```bash
# 1. Install dependencies
pnpm install

# 2. Install Playwright browsers
pnpx playwright install

# 3. Configure for your app (see Configuration below)

# 4. Verify
pnpm test:bdd
```

## Configuration

### 1. Authentication (`e2e-tests/data/authenticationData.js`)

Update the `locators` object to match your app's login form:

```javascript
locators: {
  emailInput: { testId: 'your-email-input-testid' },
  emailSubmitButton: { testId: 'your-email-submit-testid' },
  passwordInput: { testId: 'your-password-input-testid' },
  loginSubmitButton: { testId: 'your-login-submit-testid' },
}
```

### 2. Routes (`e2e-tests/data/testConfig.js`)

Add your app's routes:

```javascript
routes: {
  Home: '/home',
  SignIn: '/signin',
  Dashboard: '/dashboard',    // Your routes
  Settings: '/settings',
}
```

### 3. Environment Variables (`.env`)

```bash
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password
HEADLESS=true
```

### 4. Auth Flow (`e2e-tests/playwright/auth.setup.js`)

The default auth setup uses a two-step login (email → password). If your app has a different login flow, update `auth.setup.js` to match.

## Running Tests

```bash
pnpm test:bdd          # All tests except auth
pnpm test:bdd:auth     # Authentication tests only (clean browser state)
pnpm test:bdd:all      # Everything including auth
pnpm test:bdd:serial   # Serial execution tests only
pnpm test:bdd:debug    # Debug mode
pnpm report:playwright # View HTML report
```

## Out-of-the-Box Tests

The plugin includes a pre-built **@Authentication** module (7 scenarios):

- Login form display, successful login flow, invalid email, invalid credentials
- Empty email validation, logout flow, unauthenticated access protection

Run with: `pnpm test:bdd:auth`

Skip during install with: `bash install.sh --skip-auth`

## Creating Tests

### Manually

1. Create `e2e-tests/features/playwright-bdd/@Modules/@YourModule/`
2. Add `your-feature.feature` + `steps.js`
3. Run `pnpm test:bdd`

### Via AI Agents

1. Configure `e2e-tests/instructions.js` (copy from `instructions.example.js`)
2. Start dev server: `pnpm dev`
3. Run `/e2e-automate` in Claude Code CLI
4. Approve the plan at Phase 6
5. Tests are generated automatically

### Fix Failing Tests

```
/e2e-heal              # Auto-fix all failing tests
/e2e-heal @module      # Fix specific module
```

## Plugin Contents

```
e2e-plugin/
├── PLUGIN.md                        ← This file
├── install.sh                       ← Installation script
├── package.json.snippet             ← Dependencies + scripts to merge
├── .gitignore.snippet               ← Lines to add to .gitignore
├── playwright.config.ts             ← Multi-project BDD config
├── README-TESTING.md                ← Full testing documentation
├── .claude_README.md                ← Agentic architecture docs
├── .claude_agents/                  ← 8 agent system prompts
├── .claude_skills/                  ← 7 skill definitions
├── .claude_rules/                   ← 5 rule files
├── .claude_agent-memory/            ← Empty memory stubs
├── .claude_memory_MEMORY.md         ← Memory index
└── e2e-tests/
    ├── playwright/                  ← Fixtures, auth setup, global hooks
    ├── features/playwright-bdd/
    │   ├── shared/                  ← Reusable step definitions
    │   ├── @Modules/@Authentication/← Out-of-the-box auth tests (7 scenarios)
    │   ├── @Modules/.gitkeep        ← Ready for your module tests
    │   └── @Workflows/.gitkeep      ← Ready for workflow tests (precondition/consumer)
    ├── utils/                       ← stepHelpers.js, testDataGenerator.js
    ├── data/                        ← Auth data + test config templates
    ├── instructions.js              ← Empty config (add your entries)
    ├── instructions.example.js      ← Example pipeline configs
    └── .env.testing                 ← Environment variable template
```
