# @specwright/mcp

Unified MCP server for Specwright — bundles Playwright browser automation, file conversion, and a full 10-phase E2E test generation pipeline in a single `npx` command.

## What's Inside

| Capability | Tools | Powered by |
|---|---|---|
| E2E pipeline | 9 tools (`e2e_*`) | Built-in |
| Browser automation | 21 tools (`browser_*`) | `@playwright/mcp` (bundled) |
| File conversion | `convert_to_markdown` | `markitdown-mcp-npx` (bundled) |

No external dependencies to install — Playwright and markitdown are bundled and resolved locally.

## Pipeline Tools

Tools appear in Claude Desktop as **E2E Setup**, **E2E Automate**, etc. (proper capitalisation via MCP `annotations.title`).

| Tool | Display Name | Description |
|---|---|---|
| `e2e_setup` | E2E Setup | Native form UI to collect pipeline config (module name, page URL, test input, options). Falls back to guided chat questions when native forms are unavailable. |
| `e2e_automate` | E2E Automate | Read `instructions.js` and return full 10-phase pipeline execution plan |
| `e2e_configure` | E2E Configure | Init setup, read/list/add entries in `instructions.js` |
| `e2e_explore` | E2E Explore | Get exploration plan with auth status, known selectors, step-by-step instructions |
| `e2e_plan` | E2E Plan | Generate `seed.spec.js` + test plan from discovered selectors |
| `e2e_generate` | E2E Generate | Generate BDD `.feature` files and step definitions from a test plan |
| `e2e_execute` | E2E Execute | Run Playwright tests (seed or BDD mode) |
| `e2e_heal` | E2E Heal | Auto-heal failing BDD tests (up to 3 iterations) |
| `e2e_status` | E2E Status | Check pipeline state — config, seed file, plans, generated tests, results |

## Quick Start

Run this in your project root to scaffold everything automatically:

```bash
npx @specwright/plugin init
```

This generates a `.mcp.json` — the same config works for **Claude Code CLI**, **Claude Desktop**, and **Specwright Desktop**:

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

That's the minimal config. All three env vars below are optional depending on your setup.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SPECWRIGHT_PROJECT` | Optional | Absolute path to your project root. If omitted, the server reads from `~/.specwright/config.json` (set automatically by `e2e_setup` on first run). |
| `ANTHROPIC_API_KEY` | Optional | Enables autonomous SDK mode for `e2e_generate` and `e2e_heal`. Without it, both tools return full context + instructions to the host Claude (Claude Code / Claude Desktop) which handles generation and healing directly — no key needed. |

> **Claude Desktop**: Environment variable substitution (`${PWD}`) is not supported — set values explicitly in `claude_desktop_config.json`.

## Jira / Atlassian (Optional)

If your team uses Jira, add Atlassian as a separate MCP entry — Claude handles OAuth natively, no token needed:

```json
{
  "mcpServers": {
    "specwright": { "command": "npx", "args": ["@specwright/mcp"] },
    "atlassian": {
      "type": "streamable-http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

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

## Project Setup

Initialize a new project with the Specwright plugin:

```bash
npx @specwright/plugin init
```

This creates `.specwright.json`, `instructions.js`, Playwright config, and all required E2E framework files.

## Changelog

### 0.3.3
- Fixed `@playwright/mcp` output directory defaulting to a relative path (`.playwright-mcp`) — now uses `~/.playwright-mcp` (absolute) so screenshots and traces always save correctly regardless of MCP server CWD

### 0.3.2
- `e2e_configure` `set_project` action no longer writes to `~/.specwright/config.json` — sets project path in-memory for the session only and reads config directly from the project's `.specwright.json`

### 0.3.1
- All 9 `e2e_*` tools now display with proper capitalisation in Claude Desktop (**E2E Automate**, **E2E Setup**, etc.) via MCP `annotations.title`
- `e2e_setup` fallback (when native forms are unavailable) now asks for project path first and enforces all questions are presented verbatim

### 0.3.0
- Bundled `markitdown-mcp-npx` — PDF, Excel, Word, and more converted via `convert_to_markdown` (no `uvx`/Python install required; venv auto-created on first use)
- `e2e_generate` and `e2e_heal` work without `ANTHROPIC_API_KEY` — inline mode returns full context to host Claude
- `PLAYWRIGHT_HEADLESS` env var: `true` for Claude Desktop, visible browser by default for CLI

### 0.2.0
- Replaced four separate MCP servers (`@playwright/mcp`, `markitdown`, `atlassian`, `specwright`) with a single unified `@specwright/mcp` entry
- Atlassian moved to optional streamable-http — no token injection required

## Part of Specwright

This MCP server is part of the [Specwright](https://github.com/SanthoshDhandapani/specwright) E2E test automation platform.
