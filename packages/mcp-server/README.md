# @specwright/mcp

Unified MCP server for Specwright — bundles a full 10-phase E2E test generation pipeline, built-in file management, and browser automation in a single `npx` command.

## What's Inside

| Capability | Tools | Powered by |
|---|---|---|
| E2E pipeline | 9 tools (`e2e_*`) | Built-in |
| File management | 4 tools (`read_file`, `write_file`, `edit_file`, `list_directory`) | Built-in |
| Browser automation | 21 tools (`browser_*`) | `@playwright/mcp` (configured separately) |
| File conversion | `convert_to_markdown` | `markitdown-mcp-npx` (bundled) |

## Pipeline Tools

Tools appear in Claude Desktop as **E2E Setup**, **E2E Automate**, etc. (proper capitalisation via MCP `annotations.title`).

| Tool | Display Name | Description |
|---|---|---|
| `e2e_setup` | E2E Setup | Native form UI to collect pipeline config (module name, page URL, test input, options). Falls back to guided chat questions when native forms are unavailable. |
| `e2e_automate` | E2E Automate | Read `instructions.js` and return full 10-phase pipeline execution plan with □/🔄/✅ progress tracking |
| `e2e_configure` | E2E Configure | Init setup, read/list/add entries in `instructions.js` |
| `e2e_explore` | E2E Explore | Browser exploration with auth, scenario-driven interactions, seed file, plan file, and memory update |
| `e2e_plan` | E2E Plan | Generate `seed.spec.js` + test plan from discovered selectors |
| `e2e_generate` | E2E Generate | Generate BDD `.feature` files and step definitions from a test plan |
| `e2e_execute` | E2E Execute | Run Playwright tests (seed or BDD mode) |
| `e2e_heal` | E2E Heal | Auto-heal failing BDD tests (up to 3 iterations) with dual memory update |
| `e2e_status` | E2E Status | Check pipeline state — config, seed file, plans, generated tests, results |

## File Management Tools

Claude Desktop has no native Read/Write tools — these four built-in tools give the pipeline native file access scoped to the configured project root.

| Tool | Description |
|---|---|
| `read_file` | Read any file under the project root |
| `write_file` | Write or overwrite a file (creates parent directories) |
| `edit_file` | Exact-string replace within a file (fails if string not found or ambiguous) |
| `list_directory` | List files and subdirectories at a path |

All paths are validated — traversal outside the project root is blocked.

## Quick Start

Run this in your project root to scaffold everything automatically:

```bash
npx @specwright/plugin init
```

This generates a `.mcp.json` — the same config works for **Claude Code CLI** and **Specwright Desktop**:

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

## Claude Desktop Setup

Claude Desktop requires a separate `claude_desktop_config.json` entry. The pipeline needs two MCP servers: `specwright` (pipeline + file tools) and `playwright-test` (browser automation).

### 1. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "specwright": {
      "command": "npx",
      "args": ["@specwright/mcp"],
      "env": {
        "SPECWRIGHT_PROJECT": "/absolute/path/to/your/project"
      }
    },
    "playwright-test": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--output-dir",
        "/tmp/playwright-mcp"
      ]
    }
  }
}
```

> **Using nvm, asdf, or volta?** Claude Desktop launches MCP servers via macOS launchd, which uses a minimal `PATH` (`/usr/bin:/bin:/usr/sbin:/sbin`) — not your shell's PATH. If `npx` is installed via a version manager it won't be found. Fix it by using the absolute path to `npx` and adding a `PATH` env override:
>
> ```json
> {
>   "mcpServers": {
>     "specwright": {
>       "command": "/Users/you/.nvm/versions/node/v22.12.0/bin/npx",
>       "args": ["@specwright/mcp"],
>       "env": {
>         "SPECWRIGHT_PROJECT": "/absolute/path/to/your/project",
>         "PATH": "/Users/you/.nvm/versions/node/v22.12.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
>       }
>     },
>     "playwright-test": {
>       "command": "/Users/you/.nvm/versions/node/v22.12.0/bin/npx",
>       "args": ["@playwright/mcp@latest", "--output-dir", "/tmp/playwright-mcp"],
>       "env": {
>         "PATH": "/Users/you/.nvm/versions/node/v22.12.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
>       }
>     }
>   }
> }
> ```
>
> Find your npx path with: `which npx`  
> Find your Node version path with: `ls ~/.nvm/versions/node/` (or `~/.asdf/shims/npx` for asdf)

### 2. Restart Claude Desktop

### Why the key name must be `playwright-test`

The Specwright pipeline calls browser tools using the exact prefix `mcp__playwright-test__*` (e.g. `mcp__playwright-test__browser_navigate`, `mcp__playwright-test__browser_snapshot`). This prefix is derived directly from the MCP server key name — if your entry is named anything else (e.g. `"playwright"`, `"pw"`, `"browser"`), the pipeline tools will not resolve and exploration will fail.

**Already have Playwright installed under a different name?** Rename it:

```json
// ❌ Before — wrong key name
"playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }

// ✅ After — correct key name + required --output-dir
"playwright-test": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--output-dir", "/tmp/playwright-mcp"]
}
```

### Why `--output-dir` is required

Claude Desktop starts the Playwright MCP from the **system root** (`/`), so a relative path like `.playwright-mcp` resolves to `/.playwright-mcp` and fails with `ENOENT`. The `--output-dir` flag pins screenshots and traces to an absolute path. `/tmp/playwright-mcp` works universally across all projects without any project-specific configuration.

### 3. Set project path

Either set `SPECWRIGHT_PROJECT` in `claude_desktop_config.json` (as shown above), or run `e2e_configure` after Claude Desktop connects — it stores the path in `~/.specwright/config.json`.

> **Note:** Environment variable substitution (`${PWD}`) is not supported in Claude Desktop — use explicit absolute paths.

### Jira / Atlassian (Required for Jira URL inputs)

If any `instructions.js` entry has `inputs.jira.url` set, the Atlassian MCP **must** be present — otherwise `mcp__atlassian__getJiraIssue` won't exist and Phase 3 will fail when it tries to fetch the ticket.

Add Atlassian as a third entry — Claude handles OAuth natively, no API token needed:

```json
{
  "mcpServers": {
    "specwright": { "command": "npx", "args": ["@specwright/mcp"] },
    "playwright-test": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--output-dir", "/tmp/playwright-mcp"]
    },
    "atlassian": {
      "type": "streamable-http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

On first use, Claude will prompt you to authorise access to your Atlassian account in the browser. No credentials are stored in the config.

> **No Jira?** Leave `inputs.jira.url` empty in `instructions.js` and use the `instructions[]` array to describe scenarios directly — the Atlassian MCP is not needed.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SPECWRIGHT_PROJECT` | Optional | Absolute path to your project root. If omitted, the server reads from `~/.specwright/config.json` (set automatically by `e2e_configure` on first run). |
| `ANTHROPIC_API_KEY` | Optional | Enables autonomous SDK mode for `e2e_generate` and `e2e_heal`. Without it, both tools return full context + instructions to the host Claude which handles generation and healing directly — no key needed. |

## File Conversion

`convert_to_markdown` accepts a `uri` parameter (file URI or URL):

```
file:///path/to/document.pdf
file:///path/to/spreadsheet.xlsx
file:///path/to/document.docx
https://example.com/page
```

Supported formats: PDF, Excel (XLSX), Word (DOCX), PowerPoint (PPTX), CSV, HTML, images, and more.

> First use sets up a Python virtual environment automatically (~10–30s). Subsequent starts reuse the cached environment and are instant.

## Pipeline Behaviour

### Progress tracking

`e2e_automate` emits an 8-phase □/🔄/✅ todo list after each phase so you can see pipeline progress in Claude Desktop where tool results are hidden:

```
✅ Phase 1: Pipeline loaded
✅ Phase 2: Input source detected
✅ Phase 3: Plan file written
🔄 Phase 4: Browser exploration — in progress
□ Phase 5–8: pending
```

### Run commands

The pipeline generates `playwright-bdd` tests — the correct run command depends on the module category:

```bash
# @Modules
npx bddgen && npx playwright test --project setup --project main-e2e --grep "@modulename"

# @Workflows
npx bddgen && npx playwright test --project setup --project precondition --project workflow-consumers --grep "@modulename"
```

`npx bddgen` MUST run first — it compiles `.feature` → `.features-gen/*.spec.js`. Never use `npx cucumber-js`.

### Browser exploration

`e2e_explore` performs scenario-driven live browser interactions — one browser action per instruction, not just a single page snapshot. Agent memory is used as a selector hint but never replaces live verification.

## Project Setup

Initialize a new project with the Specwright plugin:

```bash
npx @specwright/plugin init
```

This creates `.specwright.json`, `instructions.js`, Playwright config, and all required E2E framework files.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

## Part of Specwright

This MCP server is part of the [Specwright](https://github.com/SanthoshDhandapani/specwright) E2E test automation platform.
