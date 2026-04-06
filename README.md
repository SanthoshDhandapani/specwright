# Specwright

AI-powered E2E test automation platform. Generate Playwright BDD tests from natural language, Jira tickets, or spreadsheets — with a desktop app for visual orchestration.

## What is Specwright?

Specwright is three things:

1. **Framework Plugin** (`@specwright/plugin`) — Drop-in Playwright BDD testing framework for any React app. Install with one command, get auth tests, shared steps, 3-layer data persistence, and 8 AI agents.

2. **Desktop App** (`apps/desktop`) — Electron app with a visual UI for configuring test generation pipelines. See real-time streaming from Claude, approve plans before generation, view terminal logs.

3. **MCP Server** (`@specwright/mcp-server`) — Claude Desktop integration for browser-based test exploration via Playwright MCP.

All three can be used independently or together.

## Quick Start

### Install the Plugin (into your React app)

```bash
# From your project root:
npx @specwright/plugin install

# Install dependencies + Playwright browsers
pnpm install && npx playwright install

# Run the included authentication tests
pnpm test:bdd:auth
```

### Use the Desktop App

```bash
# Clone this repo
git clone https://github.com/specwright/specwright.git
cd specwright

# Install & run
pnpm install
pnpm dev
```

Point the app at your project folder, configure your app's URL and credentials, and click Run.

### Use Claude Code CLI (no desktop app needed)

After installing the plugin, use the included Claude Code skills:

```
/e2e-automate              # Full 10-phase pipeline
/e2e-plan /home            # Explore a page + generate test plan
/e2e-generate plan.md      # Generate BDD files from a plan
/e2e-heal                  # Auto-fix failing tests
```

## Architecture

```
specwright/
├── apps/desktop/           Electron desktop app (React + Zustand + Tailwind)
├── packages/
│   ├── plugin/             E2E framework plugin (Playwright BDD + agents + skills)
│   ├── agent-runner/       Claude CLI wrapper (spawns claude with stream-json)
│   └── mcp-server/         MCP server for Claude Desktop integration
└── docs/                   Documentation
```

## How It Works

### The 10-Phase Pipeline

```
 1. Read Config          ─── instructions.js or desktop UI
 2. Route & Detect       ─── Jira / File / Text input
 3. Process Input        ─── Extract test requirements
 4. Explore App          ─── Playwright browser exploration
 5. Validate Seeds       ─── Run discovered selectors (optional)
 6. User Approval        ─── Review plan before generation
 7. Generate BDD         ─── Create .feature + steps.js
 8. Execute & Heal       ─── Run tests + auto-fix failures
 9. Cleanup              ─── Aggregate results
10. Quality Review       ─── Score (0-100) + summary
```

### Plugin Features

- **Playwright BDD** — Gherkin `.feature` files compiled to Playwright specs via `playwright-bdd`
- **8 AI Agents** — Explore apps, generate tests, fix failures, process Jira tickets
- **7 Claude Code Skills** — `/e2e-automate`, `/e2e-plan`, `/e2e-generate`, `/e2e-heal`, `/e2e-validate`, `/e2e-process`, `/e2e-run`
- **Shared Step Library** — Authentication, navigation, common assertions, global hooks
- **processDataTable Utility** — Declarative form filling with faker data generation
- **3-Layer Data Persistence** — Scenario > in-memory cache > file-backed JSON
- **Path-Based Tag Scoping** — Directory structure = step visibility rules

### Desktop App Features

- **Visual Pipeline Stepper** — 10-phase progress with status indicators and durations
- **Instructions Builder** — Visual editor for test generation configs (replaces `instructions.js`)
- **Streaming Chat** — Real-time Claude response streaming per agent
- **Terminal Panel** — Color-coded raw pipeline output
- **Config Panel** — Project path, environment, auth credentials
- **Approval Checkpoint** — Review and approve test plans before generation

## Prerequisites

- Node.js 20+
- pnpm 9+
- [Claude Code CLI](https://claude.ai/code) (for agent pipeline)
- Playwright browsers (`npx playwright install`)

## Configuration

### Authentication

Update `e2e-tests/data/authenticationData.js` to match your app's login form:

```javascript
locators: {
  emailInput: { testId: 'your-email-input' },
  emailSubmitButton: { testId: 'your-submit-button' },
  passwordInput: { testId: 'your-password-input' },
  loginSubmitButton: { testId: 'your-login-button' },
}
```

### Routes

Update `e2e-tests/data/testConfig.js`:

```javascript
routes: {
  Home: '/home',
  Dashboard: '/dashboard',
  Settings: '/settings',
  SignIn: '/signin',
}
```

### Environment

```bash
# .env
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password
HEADLESS=true
```

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
