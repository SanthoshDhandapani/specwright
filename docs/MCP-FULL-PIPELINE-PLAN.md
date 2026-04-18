# `@specwright/mcp` — Full Pipeline for Claude Desktop

**Goal:** Claude Desktop users run the complete 10-phase E2E automation pipeline through a single MCP server with no separate dependencies to configure.

---

## Problem with the Current Architecture

`mcp.json.template` today requires **4 separate MCP servers** — all configured independently by the user:

```json
{
  "e2e-automation":  "@specwright/mcp-server",          // pipeline orchestration
  "playwright-test": "@playwright/mcp",                  // browser automation (stdio)
  "atlassian":       "https://mcp.atlassian.com/v1/mcp", // Jira (streamable-http)
  "markitdown":      "uvx markitdown-mcp"                // file conversion (stdio)
}
```

| Today | After this plan |
|---|---|
| 4 MCP servers, manually configured | 1 MCP server (`@specwright/mcp`) |
| Desktop pipeline stops at Phase 5 | Full 10 phases |
| `e2e-desktop-automate` covers only exploration + planning | Full pipeline skill, all phases |
| Users wire up Atlassian OAuth separately | Bundled — auth flows through `@specwright/mcp` |

---

## Architecture Overview

```
Claude Desktop
     │
     │  one MCP server entry
     ▼
┌──────────────────────────────────────────────────────────────┐
│                      @specwright/mcp                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pipeline Orchestration Tools (existing)              │   │
│  │  e2e_configure  e2e_explore  e2e_plan                 │   │
│  │  e2e_automate   e2e_status                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pipeline Tools (new)                                 │   │
│  │  e2e_generate   e2e_execute   e2e_heal                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Browser Tools — proxied from @playwright/mcp        │   │
│  │  (spawned as stdio child process on startup)         │   │
│  │  browser_navigate  browser_snapshot  browser_click   │   │
│  │  browser_fill  browser_type  browser_select_option   │   │
│  │  browser_evaluate  browser_screenshot  browser_close │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  File Conversion Tools — proxied from markitdown-mcp │   │
│  │  (spawned as uvx child process on startup)           │   │
│  │  markitdown_convert                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Jira Tools — proxied from Atlassian MCP             │   │
│  │  (connected as streamable-http client on startup)    │   │
│  │  jira_get_issue  jira_search  jira_get_project ...   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 1: Package Rename

`packages/mcp-server` → rename to `@specwright/mcp`

```json
{
  "name": "@specwright/mcp",
  "version": "0.2.0",
  "bin": {
    "specwright-mcp": "./index.js"
  }
}
```

The binary name (`specwright-mcp`) stays the same — no breaking changes for existing users. Only the npm package name changes.

---

## Part 2: Bundled Dependencies — Proxy Architecture

All four external MCP servers from `mcp.json.template` are bundled as internal proxies. `@specwright/mcp` starts them automatically on startup — the user configures nothing separately.

### Generic Proxy Pattern

The same pattern applies to all stdio-based proxies:

```javascript
// utils/proxy.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function createStdioProxy({ command, args, label }) {
  const transport = new StdioClientTransport({ command, args });
  const client = new Client({ name: `specwright-${label}-proxy`, version: '1.0.0' });
  await client.connect(transport);
  const { tools } = await client.listTools();
  return {
    tools,
    call: (name, args) => client.callTool({ name, arguments: args }),
    close: () => client.close(),
  };
}

export async function createHttpProxy({ url, headers, label }) {
  const transport = new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } });
  const client = new Client({ name: `specwright-${label}-proxy`, version: '1.0.0' });
  await client.connect(transport);
  const { tools } = await client.listTools();
  return {
    tools,
    call: (name, args) => client.callTool({ name, arguments: args }),
    close: () => client.close(),
  };
}
```

### 2a. Playwright MCP — stdio child process

Replaces `"playwright-test": { "command": "npx", "args": ["@playwright/mcp@latest"] }`.

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwrightBin = require.resolve('@playwright/mcp/cli');

const playwright = await createStdioProxy({
  command: 'node',
  args: [playwrightBin, '--output-dir', process.env.PLAYWRIGHT_OUTPUT_DIR ?? '.playwright-mcp'],
  label: 'browser',
});
```

**New dependency:** `"@playwright/mcp": "^0.1.0"` — resolved from local `node_modules`, no `npx` overhead.

Exposed tools: all `browser_*` tools from `@playwright/mcp` — registered dynamically by iterating `playwright.tools`.

### 2b. Markitdown MCP — uvx child process

Replaces `"markitdown": { "command": "uvx", "args": ["markitdown-mcp"] }`.

```javascript
const markitdown = await createStdioProxy({
  command: 'uvx',
  args: ['markitdown-mcp'],
  label: 'markitdown',
});
```

**No new npm dependency** — uses system `uvx` (Python). If `uvx` is not available, the tool starts but returns a clear error on first call. All `markitdown_*` tools are proxied dynamically.

> **Future:** Replace with an npm `markitdown` package if one becomes available, removing the Python dependency entirely.

### 2c. Atlassian MCP — streamable-http client

Replaces `"atlassian": { "type": "streamable-http", "url": "https://mcp.atlassian.com/v1/mcp" }`.

```javascript
const atlassianToken = process.env.ATLASSIAN_TOKEN; // OAuth token from env

const atlassian = atlassianToken
  ? await createHttpProxy({
      url: 'https://mcp.atlassian.com/v1/mcp',
      headers: { Authorization: `Bearer ${atlassianToken}` },
      label: 'atlassian',
    })
  : null; // gracefully skipped if no token — Jira features unavailable
```

**Auth:** User sets `ATLASSIAN_TOKEN` in the MCP env config (Claude Desktop `claude_desktop_config.json`). No separate OAuth flow needed for CLI usage — token is passed directly. All `jira_*` tools are proxied dynamically.

> **Future Desktop UX:** A `jira_connect` tool can trigger browser-based OAuth and store the token in the project config, removing the need to set it manually.

### Tool Registration in `index.js`

All proxies register their tools with the same pattern:

```javascript
const proxies = [playwright, markitdown, atlassian].filter(Boolean);

for (const proxy of proxies) {
  for (const tool of proxy.tools) {
    tools.push({
      definition: tool,
      handler: (args) => proxy.call(tool.name, args),
    });
  }
}
```

Claude Desktop accesses everything through a single namespace: `mcp__specwright__*`.

| Old call | New call |
|---|---|
| `mcp__playwright-test__browser_navigate` | `mcp__specwright__browser_navigate` |
| `mcp__markitdown__markitdown_convert` | `mcp__specwright__markitdown_convert` |
| `mcp__atlassian__jira_get_issue` | `mcp__specwright__jira_get_issue` |

---

## Part 3: Bundled File Processing (markitdown)

### Strategy

For Excel/CSV/PDF → markdown conversion (Phase 3 file input), add a `markitdown_convert` tool that uses the `markitdown` npm package directly (no subprocess needed if a Node.js binding is available) or spawns `uvx markitdown-mcp` as a child proxy.

### Tool: `tools/markitdown.js`

```javascript
export const definition = {
  name: 'markitdown_convert',
  description: 'Convert Excel, CSV, or PDF files to markdown for test plan processing',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'Absolute path to file (.xlsx, .csv, .pdf)' },
    },
    required: ['filePath'],
  },
};

export async function handler({ filePath }) {
  // Option A: use markitdown npm package if available
  // Option B: shell out to `uvx markitdown {filePath}`
  const { execSync } = await import('child_process');
  const result = execSync(`uvx markitdown "${filePath}"`, { encoding: 'utf8' });
  return { content: [{ type: 'text', text: result }] };
}
```

---

## Part 4: New Pipeline Tools

These are the three tools that complete the pipeline beyond Phase 5.

### 4.1 `e2e_generate` — BDD Generation (Phase 7)

**What it does:** Reads the plan file + seed file + stepHelpers, makes an internal Claude API call using the embedded bdd-generator + code-generator prompts, writes `.feature` + `steps.js` to disk.

**File:** `tools/generate.js`

```javascript
export const definition = {
  name: 'e2e_generate',
  description: 'Generate BDD .feature file and steps.js from an approved test plan',
  inputSchema: {
    type: 'object',
    properties: {
      planFilePath: { type: 'string', description: 'Path to the approved plan .md file' },
      moduleName:   { type: 'string', description: 'e.g. @HomePage' },
      category:     { type: 'string', description: '@Modules or @Workflows' },
    },
    required: ['planFilePath', 'moduleName', 'category'],
  },
};
```

**Internal flow:**
1. Read `planFilePath`, `seed.spec.js`, `stepHelpers.js` from the project
2. POST to Anthropic API with:
   - System prompt: contents of `bdd-generator.md`
   - User message: plan + seed + stepHelpers content
3. Parse response → extract `.feature` content + `steps.js` content
4. Write files to `e2e-tests/features/playwright-bdd/{category}/{moduleName}/`
5. Return: file paths created, scenario count

**API call pattern (same as agent-runner SDK):**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 8192,
  system: bddGeneratorPrompt,    // read from bdd-generator.md at startup
  messages: [{ role: 'user', content: userMessage }],
});
```

### 4.2 `e2e_execute` — Test Execution (Phase 8)

**What it does:** Runs `npx bddgen && npx playwright test` with inferred projects. Returns pass/fail results.

**File:** `tools/execute.js`

```javascript
export const definition = {
  name: 'e2e_execute',
  description: 'Run BDD tests or seed file and return execution results',
  inputSchema: {
    type: 'object',
    properties: {
      mode:       { type: 'string', enum: ['bdd', 'seed'] },
      moduleName: { type: 'string', description: 'e.g. @HomePage — used for project inference in bdd mode' },
      category:   { type: 'string', description: '@Modules or @Workflows' },
    },
    required: ['mode'],
  },
};
```

**Project inference logic** (mirrors execution-manager.md exactly):
```javascript
async function inferProjects(category, moduleName, projectRoot) {
  if (category === '@Workflows') return ['setup', 'run-workflow'];
  if (moduleName?.toLowerCase().includes('auth')) return ['auth-tests'];

  // Read feature file to check @serial-execution
  const featureGlob = `${projectRoot}/e2e-tests/features/playwright-bdd/${category}/${moduleName}/*.feature`;
  const [featurePath] = await glob(featureGlob);
  if (featurePath) {
    const content = await fs.readFile(featurePath, 'utf8');
    if (content.includes('@serial-execution')) return ['setup', 'serial-execution'];
  }
  return ['setup', 'main-e2e'];
}
```

**Execution:**
```javascript
const { execSync } = require('child_process');
const projects = await inferProjects(category, moduleName, projectRoot);
const projectFlags = projects.map(p => `--project ${p}`).join(' ');
execSync(`npx bddgen && npx playwright test ${projectFlags} --grep "${moduleName}"`, {
  cwd: projectRoot,
  stdio: 'pipe',
});
```

Returns: `{ passed, failed, total, duration, failures: [...] }`

### 4.3 `e2e_heal` — Auto-Healing (Phase 8, failure path)

**What it does:** Receives test failures from `e2e_execute`, makes an internal Claude API call using the embedded playwright-test-healer prompt to fix selectors, writes fixes to step files, re-runs up to 3 times.

**File:** `tools/heal.js`

```javascript
export const definition = {
  name: 'e2e_heal',
  description: 'Auto-heal failing BDD tests — investigates source, fixes selectors, reruns (max 3 iterations)',
  inputSchema: {
    type: 'object',
    properties: {
      moduleName: { type: 'string' },
      failures:   { type: 'array', description: 'Failure objects from e2e_execute' },
    },
    required: ['moduleName', 'failures'],
  },
};
```

**Internal flow:**
1. For each failure, grep `src/` for the selector
2. POST to Anthropic API with healer prompt + failure details + source snippets
3. Parse response → extract file edits
4. Apply edits to `steps.js`
5. Call `e2e_execute` again
6. Repeat up to 3 iterations

---

## Part 5: Updated `e2e-desktop-automate/SKILL.md`

Replace the current 5-phase skill with a full 10-phase skill. All tool references change from two namespaces to one:

| Old tool name | New tool name |
|---|---|
| `mcp__e2e-automation__e2e_configure` | `mcp__specwright__e2e_configure` |
| `mcp__e2e-automation__e2e_explore` | `mcp__specwright__e2e_explore` |
| `mcp__e2e-automation__e2e_plan` | `mcp__specwright__e2e_plan` |
| `mcp__e2e-automation__e2e_status` | `mcp__specwright__e2e_status` |
| `mcp__playwright-test__browser_navigate` | `mcp__specwright__browser_navigate` |
| `mcp__playwright-test__browser_snapshot` | `mcp__specwright__browser_snapshot` |
| `mcp__playwright-test__browser_click` | `mcp__specwright__browser_click` |
| _(all other browser_* tools)_ | `mcp__specwright__browser_*` |
| `mcp__markitdown__markitdown_convert` | `mcp__specwright__markitdown_convert` |
| `mcp__atlassian__jira_get_issue` | `mcp__specwright__jira_get_issue` |
| _(all other jira_* tools)_ | `mcp__specwright__jira_*` |
| _(does not exist yet)_ | `mcp__specwright__e2e_generate` |
| _(does not exist yet)_ | `mcp__specwright__e2e_execute` |
| _(does not exist yet)_ | `mcp__specwright__e2e_heal` |

**New phase mapping:**

| Phase | Tool(s) used |
|---|---|
| 1 — Initialize | `e2e_configure` (action: init) |
| 2 — Detect & Route | Read `instructions.js` via `e2e_automate` |
| 3 — Input Processing | `markitdown_convert` (file mode) / direct text / Jira fetch |
| 4 — Exploration | `e2e_explore` → `browser_navigate` → `browser_snapshot` → ... → `e2e_plan` |
| 5 — Seed Validation | `e2e_execute` (mode: seed) |
| 6 — Approval | Human gate (or `autoApprove: true` bypass) |
| 7 — BDD Generation | `e2e_generate` |
| 8 — Execution & Healing | `e2e_execute` (mode: bdd) → `e2e_heal` if failures |
| 9 — Cleanup | `e2e_configure` (action: cleanup) |
| 10 — Final Review | `e2e_status` |

---

## Part 6: Claude Desktop Configuration

After implementation, the user's `claude_desktop_config.json` has a **single entry**:

```json
{
  "mcpServers": {
    "specwright": {
      "command": "npx",
      "args": ["@specwright/mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "SPECWRIGHT_PROJECT": "/path/to/your/project",
        "ATLASSIAN_TOKEN": "your-atlassian-token"
      }
    }
  }
}
```

| Env var | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | `e2e_generate` + `e2e_heal` internal Claude API calls |
| `SPECWRIGHT_PROJECT` | Yes | Project root the MCP server operates on |
| `ATLASSIAN_TOKEN` | Optional | Jira tools — skipped gracefully if not set |

**Before (today — `mcp.json.template`, 4 separate entries):**
```json
{
  "mcpServers": {
    "e2e-automation":  { "command": "npx", "args": ["@specwright/mcp-server"] },
    "playwright-test": { "command": "npx", "args": ["@playwright/mcp@latest", "--output-dir", ".playwright-mcp"] },
    "atlassian":       { "type": "streamable-http", "url": "https://mcp.atlassian.com/v1/mcp" },
    "markitdown":      { "command": "uvx", "args": ["markitdown-mcp"] }
  }
}
```

**After (`mcp.json.template` becomes a one-liner):**
```json
{
  "mcpServers": {
    "specwright": {
      "command": "npx",
      "args": ["@specwright/mcp"]
    }
  }
}
```

---

## Part 7: Embedded Agent Prompts Strategy

`e2e_generate` and `e2e_heal` need the bdd-generator, code-generator, and healer agent system prompts. Two options:

**Option A: Read from installed plugin files at runtime**
```javascript
const pluginPath = path.join(projectRoot, '.claude/agents');
const bddGeneratorPrompt = await fs.readFile(`${pluginPath}/bdd-generator.md`, 'utf8');
```
Pro: Always in sync with the installed plugin version. No duplication.  
Con: Requires plugin to be installed in the project (`npx @specwright/plugin init` already done).

**Option B: Bundle prompts inside the MCP server package**
Copy agent `.md` files into the MCP server at build time.  
Pro: Works even without plugin installed (standalone MCP mode).  
Con: Out of sync if plugin is updated but MCP server is not.

**Recommended: Option A.** The plugin must be installed before using the MCP server anyway (the project needs `e2e-tests/`, `playwright.config.ts`, etc.). Reading from installed files keeps prompts in sync automatically.

---

## Implementation Sequence

| # | Task | Effort | Dependency |
|---|------|--------|------------|
| 1 | Rename package `mcp-server` → `@specwright/mcp` in `package.json` | Trivial | — |
| 2 | Implement `utils/proxy.js` — generic stdio + http proxy factory | Small | — |
| 3 | Add `@playwright/mcp` dependency; wire Playwright proxy in `index.js` | Small | 2 |
| 4 | Wire markitdown proxy (`uvx markitdown-mcp`) in `index.js` | Small | 2 |
| 5 | Wire Atlassian HTTP proxy (optional, skipped if no `ATLASSIAN_TOKEN`) in `index.js` | Small | 2 |
| 6 | Update `mcp.json.template` → single `@specwright/mcp` entry | Trivial | 1 |
| 7 | Add `e2e_execute` tool with project inference logic (`tools/execute.js`) | Medium | — |
| 8 | Add `e2e_generate` tool with Anthropic API call (`tools/generate.js`) | Medium | 7 |
| 9 | Add `e2e_heal` tool (`tools/heal.js`) | Medium | 7, 8 |
| 10 | Rewrite `e2e-desktop-automate/SKILL.md` — full 10 phases, `mcp__specwright__*` tool names | Medium | 3–5, 8, 9 |
| 11 | Publish `@specwright/mcp@0.2.0` | Trivial | 1–9 |
| 12 | Update Claude Desktop setup docs + README | Small | 11 |

---

## What Stays the Same

- **`e2e-automate/SKILL.md`** — unchanged, continues to work on Claude Code CLI via skills
- **`packages/plugin`** — unchanged, still installed via `npx @specwright/plugin init`
- **All existing agent `.md` files** — unchanged, read by `e2e_generate` at runtime
- **`playwright.config.ts`** — unchanged, `e2e_execute` uses the project's config as-is
- **`apps/desktop` (Electron app)** — unchanged, different distribution channel

---

## What This Enables

```
User in Claude Desktop:
  "Generate E2E tests for http://localhost:5173/home — verify navigation and page title"

Claude Desktop:
  Phase 1  → mcp__specwright__e2e_configure
  Phase 4  → mcp__specwright__e2e_explore + browser_navigate + browser_snapshot + ...
  Phase 4  → mcp__specwright__e2e_plan (writes seed.spec.js + plan.md)
  Phase 6  → [presents plan] "Approve & Generate?"
  Phase 7  → mcp__specwright__e2e_generate (writes .feature + steps.js)
  Phase 8  → mcp__specwright__e2e_execute (runs bddgen + playwright)
  Phase 8  → mcp__specwright__e2e_heal (if failures)
  Phase 10 → mcp__specwright__e2e_status (quality score)

Result: 9 scenarios generated, 8/9 passing. Review plan at reports/review-plan-...
```

No terminal. No Claude Code CLI. No separate MCP server configs. Just Claude Desktop + one MCP entry.
