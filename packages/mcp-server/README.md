# @specwright/mcp-server

MCP server for E2E test automation. Provides 5 tools for configuring, exploring, planning, and automating Playwright BDD test generation.

## Tools

| Tool | Description |
|------|-------------|
| `e2e_configure` | Init setup, read/list/add entries in `instructions.js` |
| `e2e_explore` | Get exploration plan with auth status, known selectors, step-by-step instructions |
| `e2e_plan` | Generate `seed.spec.js` + test plan markdown from discovered selectors |
| `e2e_status` | Check pipeline state — config, seed file, plans, test results |
| `e2e_automate` | Read `instructions.js` and return full pipeline execution plan |

## Usage with Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "e2e-automation": {
      "command": "npx",
      "args": ["@specwright/mcp-server"]
    }
  }
}
```

Then use the `/e2e-desktop-automate` skill (from `@specwright/plugin`) or call tools directly.

## Usage with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "e2e-automation": {
      "command": "npx",
      "args": ["@specwright/mcp-server"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    },
    "microsoft-playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_ROOT` | `process.cwd()` | Project root directory |
| `BASE_URL` | `http://localhost:5173` | Application URL for exploration |
| `AUTH_REQUIRED` | `true` | Whether authentication is needed |
| `AUTH_DATA` | — | JSON object with auth credentials |

## Part of Specwright

This MCP server is part of the [Specwright](https://github.com/SanthoshDhandapani/specwright) E2E test automation platform. Install the full framework with:

```bash
npx @specwright/plugin init
```
