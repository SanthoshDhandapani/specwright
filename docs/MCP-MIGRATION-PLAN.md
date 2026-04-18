# MCP Migration Plan — DYFN-11735
## Expert Architectural Review

---

## The Hard Constraints (Non-Negotiable)

The agents in `packages/plugin` define the required MCP server names through their frontmatter. These cannot change:

| Agent | Requires server named | Tools accessed |
|-------|-----------------------|----------------|
| `playwright-test-planner.md` | `playwright-test` | `browser_*` + `generator_*` + `planner_*` |
| `playwright-test-generator.md` | `playwright-test` | `browser_*` + `browser_verify_*` + `generator_*` |
| `playwright-test-healer.md` | `playwright-test` | `browser_*` + `browser_generate_locator` + `test_*` |
| `input-processor.md` | `markitdown` | `convert_to_markdown` |
| `jira-processor.md` | `atlassian` | Atlassian MCP tools |
| `e2e-desktop-automate/SKILL.md` | `specwright` | `e2e_*` + `browser_*` |

The server name in `.mcp.json` determines the `mcp__<name>__*` prefix. **Four distinct server names are required.** One binary can only serve under one name at a time.

---

## Architecture Decision

**`@specwright/mcp` is the `playwright-test` server for CLI agents, and the `specwright` server for Claude Desktop.**

Same binary. Different name assigned by context. All custom tools live in `@specwright/mcp`.

```
@specwright/mcp
├── Proxies → @playwright/mcp       (all browser_* tools)
├── Custom  → generator_*, planner_* (recording workflow)
├── Custom  → test_run, test_debug, test_list
├── Custom  → browser_verify_*, browser_generate_locator
└── Native  → e2e_* pipeline tools
```

`markitdown` and `atlassian` remain independent servers. `@specwright/plugin init` installs `markitdown-mcp` automatically — users run nothing manually.

---

## `.mcp.json` Template (CLI — what client projects get)

```json
{
  "mcpServers": {
    "playwright-test": {
      "command": "npx",
      "args": ["@specwright/mcp"]
    },
    "markitdown": {
      "command": "npx",
      "args": ["markitdown-mcp"]
    },
    "atlassian": {
      "type": "streamable-http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

Resolution:
- `mcp__playwright-test__browser_navigate` → `@specwright/mcp` → proxied to `@playwright/mcp` ✓
- `mcp__playwright-test__generator_setup_page` → `@specwright/mcp` → native custom tool ✓
- `mcp__playwright-test__test_run` → `@specwright/mcp` → native custom tool ✓
- `mcp__markitdown__convert_to_markdown` → `markitdown-mcp` (installed by plugin init) ✓
- `mcp__atlassian__*` → streamable-http (no install, OAuth managed) ✓

## Claude Desktop (`claude_desktop_config.json`)

```json
{
  "specwright": {
    "command": "node",
    "args": ["/path/to/@specwright/mcp/index.js"]
  }
}
```

Same binary named `specwright`:
- `mcp__specwright__e2e_automate` → native pipeline tool ✓
- `mcp__specwright__browser_navigate` → proxied to `@playwright/mcp` ✓
- `mcp__specwright__convert_to_markdown` → proxied to `markitdown-mcp-npx` ✓

## Specwright Desktop App (`pipeline.ipc.ts`)

Desktop reads the project `.mcp.json`. It must inject runtime env vars into the `playwright-test` entry (not `specwright` — that is in Claude Desktop config, not project `.mcp.json`):

```typescript
if (name === "playwright-test") {
  cfg.env = {
    ...cfg.env,
    SPECWRIGHT_PROJECT: projectPath,
    PLAYWRIGHT_OUTPUT_DIR: screenshotDir,
    PLAYWRIGHT_HEADLESS: headless ? "true" : "false",
  };
}
```

Desktop also reads `atlassian` from `.mcp.json` and injects Bearer token if user has completed OAuth.

---

## What Changes — Complete File List

### Zero changes to `packages/plugin/`

No agent `.md` files. No skill `.md` files. No `package.json`. Nothing.

### `packages/mcp-server/` — 4 files

**New: `tools/recorder.js`**

| Tool | Inputs | Behaviour |
|------|--------|-----------|
| `generator_setup_page` | `seedFile`, `project`, `plan` | Clear session code log; mark recording as active |
| `generator_read_log` | — | Return accumulated Playwright code from current session |
| `generator_write_test` | `fileName`, `code` | Write `code` to `{SPECWRIGHT_PROJECT}/{fileName}` |
| `planner_setup_page` | `seedFile`, `project`, `plan` | Alias for `generator_setup_page` |
| `planner_save_plan` | `fileName`, `content` | Write `content` to `{SPECWRIGHT_PROJECT}/{fileName}` |

Recording: every proxied `browser_*` call appends its equivalent Playwright code to a session log while recording is active. `generator_read_log` returns that log.

**New: `tools/verify.js`**

| Tool | Inputs | Behaviour |
|------|--------|-----------|
| `browser_verify_element_visible` | `selector` | Assert element exists and is in viewport via `browser_evaluate` |
| `browser_verify_list_visible` | `selector`, `items[]` | Assert each item text appears in matching elements |
| `browser_verify_text_visible` | `text` | Assert text present in `document.body.innerText` |
| `browser_verify_value` | `selector`, `value` | Assert `input.value === value` |
| `browser_generate_locator` | `ref` | Return testid/role/label-based locator string for the ref |

**New: `tools/test.js`**

| Tool | Inputs | Behaviour |
|------|--------|-----------|
| `test_run` | `pattern?`, `project?`, `grep?` | `npx playwright test` in `SPECWRIGHT_PROJECT`; returns stdout |
| `test_debug` | `pattern`, `project?` | `npx playwright test --debug` |
| `test_list` | `project?` | `npx playwright test --list` |

**Modified: `index.js`**

- Register `recorder.js`, `verify.js`, `test.js` tools
- Wrap the playwright proxy call to record actions when a session is active
- Keep existing proxy for `@playwright/mcp` and `markitdown-mcp-npx`

### `packages/plugin/mcp.json.template` — rename key + add markitdown

```json
{
  "playwright-test": { "command": "npx", "args": ["@specwright/mcp"] },
  "markitdown":      { "command": "npx", "args": ["markitdown-mcp"] },
  "atlassian":       { "type": "streamable-http", "url": "https://mcp.atlassian.com/v1/mcp" }
}
```

### `apps/examples/show-buff/.mcp.json` — same change

### `apps/desktop/src/main/ipc/pipeline.ipc.ts`

Change env var injection target: `name === "specwright"` → `name === "playwright-test"`.

### `@specwright/plugin` init script (separate repo)

Add `markitdown-mcp` to the packages installed during `npx @specwright/plugin init`.

---

## Verification Matrix

| Scenario | Tool called | Server name | Resolves via | Status |
|----------|-------------|-------------|--------------|--------|
| CLI agent explores app | `mcp__playwright-test__browser_navigate` | `playwright-test` in `.mcp.json` | `@specwright/mcp` → `@playwright/mcp` proxy | ✓ |
| CLI agent records test | `mcp__playwright-test__generator_setup_page` | `playwright-test` in `.mcp.json` | `@specwright/mcp` native | ✓ |
| CLI agent reads log | `mcp__playwright-test__generator_read_log` | `playwright-test` in `.mcp.json` | `@specwright/mcp` native | ✓ |
| CLI agent heals test | `mcp__playwright-test__test_run` | `playwright-test` in `.mcp.json` | `@specwright/mcp` native | ✓ |
| CLI agent converts file | `mcp__markitdown__convert_to_markdown` | `markitdown` in `.mcp.json` | `markitdown-mcp` direct | ✓ |
| CLI agent fetches Jira | `mcp__atlassian__getJiraIssue` | `atlassian` in `.mcp.json` | streamable-http | ✓ |
| Claude Desktop pipeline | `mcp__specwright__e2e_automate` | `specwright` in desktop config | `@specwright/mcp` native | ✓ |
| Claude Desktop browser | `mcp__specwright__browser_snapshot` | `specwright` in desktop config | `@specwright/mcp` → `@playwright/mcp` proxy | ✓ |
| Specwright Desktop agents | `mcp__playwright-test__browser_*` | from project `.mcp.json` | `@specwright/mcp` → `@playwright/mcp` proxy | ✓ |

---

## Commit Plan

| # | Commit | Files |
|---|--------|-------|
| 1 | `DYFN-11735: mcp-server session work — PATH fix, outputDir, set_project, input routing` | All already-changed mcp-server + desktop + skill files |
| 2 | `DYFN-11735: add recorder, verify, test-runner tools to specwright MCP` | `tools/recorder.js`, `tools/verify.js`, `tools/test.js`, `index.js` |
| 3 | `DYFN-11735: rename mcp template key to playwright-test, add markitdown entry` | `mcp.json.template`, `show-buff/.mcp.json` |
| 4 | `DYFN-11735: fix desktop env injection target for playwright-test server` | `pipeline.ipc.ts` |
