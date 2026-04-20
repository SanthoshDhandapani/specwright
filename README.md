<p align="center">
  <h1 align="center">Specwright</h1>
  <p align="center">
    AI-powered E2E test automation. Point at your app, explore with real browsers, generate Playwright BDD tests.
  </p>
  <p align="center">
    <strong>No SaaS. No vendor lock-in. Runs locally. Open source.</strong>
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@specwright/plugin"><img alt="npm" src="https://img.shields.io/npm/v/@specwright/plugin?logo=npm&label=%40specwright%2Fplugin&color=red"></a>
  <a href="https://www.npmjs.com/package/@specwright/mcp"><img alt="npm" src="https://img.shields.io/npm/v/@specwright/mcp?logo=npm&label=%40specwright%2Fmcp&color=red"></a>
  <a href="https://github.com/SanthoshDhandapani/specwright"><img alt="GitHub" src="https://img.shields.io/badge/github-SanthoshDhandapani%2Fspecwright-black?logo=github"></a>
  <a href="https://github.com/SanthoshDhandapani/specwright/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/SanthoshDhandapani/specwright"></a>
  <a href="https://specwright-e2e-test-automator.vercel.app"><img alt="Docs" src="https://img.shields.io/badge/docs-specwright-blue?logo=vercel"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#three-interfaces">Interfaces</a> &bull;
  <a href="#the-10-phase-pipeline">Pipeline</a> &bull;
  <a href="#showbuff-demo">Demo</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="https://specwright-e2e-test-automator.vercel.app/docs">Documentation</a>
</p>

---

## What is Specwright?

Specwright turns **"here's my app URL"** into **"here are your E2E tests"** using AI.

It explores your web app in a real browser, discovers UI elements and selectors, then generates production-grade [Playwright BDD](https://github.com/nicolo-ribaudo/playwright-bdd) tests (Gherkin `.feature` files + step definitions) — with self-healing when tests fail.

**100% local.** Specwright runs entirely on your machine using your own Claude session. No data leaves your environment — no remote servers, no telemetry, no code capture.

<p align="center">
  <img src="assets/images/read_instructions.png" alt="Specwright Desktop — reading instructions and building the pipeline plan" width="100%">
  <br>
  <em>Specwright Desktop: reading your instructions and building the test pipeline plan</em>
</p>

---

## Quick Start

### 1. Install the plugin

```bash
npx @specwright/plugin init
pnpm install && npx playwright install
```

This scaffolds the full E2E framework into your project: AI agents, skills, shared step definitions, Playwright BDD config, and `.mcp.json`.

### 2. Configure your test

Edit `e2e-tests/instructions.js`:

```js
export default [
  {
    moduleName: "@LoginPage",
    category: "@Modules",
    fileName: "login",
    pageURL: "http://localhost:3000/login",
    explore: true,
    instructions: [
      "Verify login form shows email and password fields",
      "Valid credentials redirect to /dashboard",
      "Invalid password shows error message",
    ],
  },
];
```

### 3. Run the pipeline

```bash
claude       # open Claude Code
/e2e-automate
```

Full docs: **[specwright-e2e-test-automator.vercel.app/docs](https://specwright-e2e-test-automator.vercel.app/docs)**

---

## Three Interfaces

### 1. Plugin + Claude Code CLI

Best for developers who live in the terminal.

```bash
npx @specwright/plugin init      # Install into your project
claude                            # Open Claude Code in your project
> /e2e-automate                  # Full 10-phase pipeline
> /e2e-plan http://localhost:3000/login   # Explore a single page
> /e2e-generate plan.md          # Generate BDD from an existing plan
> /e2e-run                       # Run tests
> /e2e-heal                      # Auto-fix failing tests
```

### 2. Specwright Desktop App (Electron)

Best for QA engineers and teams who prefer a visual interface.

- **Left Panel** — Project picker, app URL, environment vars, auth config
- **Center Panel** — Visual instructions editor + streaming agent output
- **Right Panel** — Quick-start templates + collapsible terminal

<p align="center">
  <img src="assets/images/user_review&approval.png" alt="Specwright Desktop — Phase 6 user review and approval" width="100%">
  <br>
  <em>Phase 6: Review the generated test plan before BDD generation begins</em>
</p>

```bash
git clone https://github.com/SanthoshDhandapani/specwright.git
cd specwright && pnpm install
cd apps/desktop && npx electron-vite dev
```

### 3. Claude Desktop (MCP)

Best for Claude Desktop users who want to trigger the pipeline via natural language.

Add `@specwright/mcp` to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "specwright": {
      "command": "npx",
      "args": ["-y", "@specwright/mcp"],
      "env": { "PROJECT_PATH": "/absolute/path/to/your-project" }
    }
  }
}
```

Then open your project in Claude Desktop and type:

```
Generate E2E tests for the login page at http://localhost:3000/login using Specwright
```

---

## The 10-Phase Pipeline

```
Phase 1:  Initialization      Read instructions.js → build pipeline plan
Phase 2:  Input Detection     Jira ticket / local file / plain text
Phase 3:  Input Processing    Convert to structured test scenarios
Phase 4:  Browser Exploration Live browser exploration + selector discovery
Phase 5:  Seed Validation     Run discovered selectors to confirm they work
Phase 6:  User Approval       Review the plan before any files are generated
Phase 7:  BDD Generation      Write .feature files + steps.js
Phase 8:  Execution & Healing Run tests + auto-fix failures (up to 3 iterations)
Phase 9:  Cleanup             Aggregate and archive results
Phase 10: Final Review        Quality score + phase-by-phase summary
```

### What gets generated

```
e2e-tests/features/playwright-bdd/
├── @Modules/
│   ├── @LoginPage/          login.feature + steps.js
│   └── @HomePage/           homepage.feature + steps.js
└── @Workflows/
    └── @UserJourney/
        ├── @0-Precondition/ steps.js
        └── @1-Verify/       steps.js
```

---

## ShowBuff Demo

**ShowBuff** (`apps/examples/show-buff/`) is the primary demo app — a TV show discovery app with OAuth, custom Watchlists, and Favorites.

**Live app:** [specwright-show-buff.vercel.app](https://specwright-show-buff.vercel.app/)

```bash
# Run locally
cd apps/examples/show-buff
pnpm install && pnpm dev
# Open http://localhost:5173

# Run the pipeline against it
claude
> /e2e-automate
```

---

## Architecture

```
specwright/
├── apps/
│   ├── desktop/          Electron desktop app (main / preload / renderer)
│   ├── examples/
│   │   └── show-buff/    ShowBuff demo app (TVMaze + OAuth)
│   └── web/              Documentation site (Next.js)
│
└── packages/
    ├── plugin/            @specwright/plugin — E2E framework scaffolded into your project
    └── mcp/               @specwright/mcp — MCP server for Claude Desktop (optional)
```

**Tech stack:** Electron 33, React 18, Zustand, Tailwind CSS, `@anthropic-ai/claude-agent-sdk`, `playwright-bdd`, `@playwright/mcp`

---

## Configuration

### `e2e-tests/instructions.js`

The primary config file. Each entry defines one module or workflow:

```js
export default [
  {
    moduleName: "@LoginPage",    // becomes directory + tag
    category: "@Modules",        // @Modules or @Workflows
    fileName: "login",           // output file name
    pageURL: "http://localhost:3000/login",
    explore: true,               // true = browser exploration, false = scan src/
    instructions: [/* ... */],
    inputs: {},                  // optional: { jira: { url: "..." } } or { filePath: "..." }
    runGeneratedCases: false,    // run tests after generation?
  },
];
```

Full field reference: [specwright-e2e-test-automator.vercel.app/docs/configuration/instructions](https://specwright-e2e-test-automator.vercel.app/docs/configuration/instructions)

### `e2e-tests/.env.testing`

```bash
BASE_URL=http://localhost:3000
AUTH_STRATEGY=email-password       # or: oauth, none
TEST_USER_EMAIL=your@email.com
TEST_USER_PASSWORD=your-password
HEADLESS=true                      # set false to watch the browser
```

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Claude Code CLI** — [claude.ai/code](https://claude.ai/code)
- **Playwright browsers** — `npx playwright install chromium`

---

## Documentation

Full documentation at **[specwright-e2e-test-automator.vercel.app/docs](https://specwright-e2e-test-automator.vercel.app/docs)**

- [Getting Started](https://specwright-e2e-test-automator.vercel.app/docs/getting-started/introduction)
- [10-Phase Pipeline](https://specwright-e2e-test-automator.vercel.app/docs/core-concepts/pipeline)
- [instructions.js reference](https://specwright-e2e-test-automator.vercel.app/docs/configuration/instructions)
- [Auth Strategies](https://specwright-e2e-test-automator.vercel.app/docs/configuration/auth-strategies)
- [Troubleshooting](https://specwright-e2e-test-automator.vercel.app/docs/troubleshooting/common-errors)

---

## Contributing

Contributions are welcome.

```bash
git clone https://github.com/SanthoshDhandapani/specwright.git
cd specwright && pnpm install

# Run the desktop app
cd apps/desktop && npx electron-vite dev

# Run ShowBuff
cd apps/examples/show-buff && pnpm dev

# Run the docs site
cd apps/web && pnpm dev
```

---

## License

MIT

---

<p align="center">
  Built on <a href="https://playwright.dev">Playwright</a> · Powered by <a href="https://claude.ai/code">Claude Code</a>
</p>
