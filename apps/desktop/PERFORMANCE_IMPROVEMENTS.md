# Performance Improvements — Specwright Desktop

A record of all performance and token-efficiency improvements made to the desktop pipeline and plugin agents.

---

## 1. Local Playwright MCP Binary (300ms–3s saved per spawn)

**Problem:** `pipeline.ipc.ts` and `PlaywrightMcpClient.ts` used `npx @playwright/mcp@latest` to start the browser MCP server. Every pipeline run triggered an `npx` resolution check, adding 300ms–3s of overhead before the first browser call.

**Fix:** Installed `@playwright/mcp` as a workspace dependency and resolved the local binary at runtime.

```typescript
// Before
command: "npx", args: ["@playwright/mcp@latest", ...]

// After
const pkgPath = require.resolve("@playwright/mcp/package.json");
const playwrightMcpBin = path.join(path.dirname(pkgPath), "cli.js");
command: "node", args: [playwrightMcpBin, ...]
```

> Note: `require.resolve("@playwright/mcp/cli")` fails because `./cli` is not in the package's exports map. Resolve via `package.json` then join `cli.js` instead.

**Files changed:**
- `apps/desktop/src/main/ipc/pipeline.ipc.ts`
- `packages/agent-runner/src/PlaywrightMcpClient.ts`
- `specwright/package.json` (added `"@playwright/mcp": "^0.0.70"`)

---

## 2. Strict MCP Config — No User System MCPs

**Problem:** The Claude Agent SDK spawns Claude Code CLI which reads `~/.claude.json` and merges the user's global MCP servers (Slack, GitHub, Linear, etc.) alongside the MCPs we explicitly configure. This loads unnecessary connections and slows pipeline startup.

**Fix:** Added `strictMcpConfig: true` to the Runner options. This passes `--strict-mcp-config` to the CLI, telling it to use **only** the MCPs provided via `--mcp-config` and ignore user global config.

```typescript
sdkOptions: {
  agentProgressSummaries: true,
  strictMcpConfig: true,   // ← only use MCPs we explicitly configure
},
```

**Files changed:**
- `apps/desktop/src/main/ipc/pipeline.ipc.ts`

---

## 3. Moved Browser Exploration Instructions Out of Source Code

**Problem:** `pipeline.ipc.ts` injected two large blocks into the system prompt on every run:
- `BROWSER EXPLORATION` — how to use Playwright MCP tools
- `PHASE 7 PERFORMANCE` — don't re-explore after approval

This bloated the system prompt with content that duplicated what skill/agent files should own. CLI users also did not benefit from these instructions.

**Fix:** Removed both blocks from `pipeline.ipc.ts` and moved them to skill files (parity between desktop and CLI execution):

| Instruction | Moved to |
|-------------|----------|
| Browser exploration guidance | `packages/plugin/.claude_skills/e2e-plan/SKILL.md` |
| Phase 7 performance (no re-exploration) | `packages/plugin/.claude_skills/e2e-automate/SKILL.md` |

The `PIPELINE CONTEXT` block was kept in source code — it is legitimately desktop-specific (overrides Jira ticket policies for the pipeline session).

**Files changed:**
- `apps/desktop/src/main/ipc/pipeline.ipc.ts` (removed ~20 lines of system prompt injection)
- `packages/plugin/.claude_skills/e2e-plan/SKILL.md`
- `packages/plugin/.claude_skills/e2e-automate/SKILL.md`

---

## 4. Adaptive Exploration Strategy (60–80% fewer browser calls)

**Problem:** The planner agent took 15–30+ full-page browser snapshots per module with no depth limits or memory reuse.

**Fix:** Added an adaptive exploration strategy to the planner agent:

| Mode | When | Budget |
|------|------|--------|
| **Verification mode** | Memory already has selectors for this URL | ≤ 5 browser calls |
| **Normal mode** | First-time exploration | ≤ 20 browser calls total |

### Strategy rules
- **Check memory first** — if `.claude/agent-memory/playwright-test-planner/MEMORY.md` has recent selectors for the URL, skip full re-discovery
- **One full-page snapshot** — take a single overview snapshot to identify interactive regions
- **Targeted snapshots** — use `browser_snapshot` with `ref` parameter to snapshot only a specific element subtree, not the full page
- **Write early** — stop exploring as soon as sufficient selectors are found; do not exhaustively click every element
- **Source code hint** — for small local projects only: grep `src/` for `data-testid` to pre-discover selectors without browser calls (skipped for external URLs or large projects)

**Files changed:**
- `packages/plugin/.claude_agents/playwright/playwright-test-planner.md`
- `packages/plugin/.claude_skills/e2e-plan/SKILL.md`

---

## 5. Browser Closes Before File Writing

**Problem:** The browser process stayed open during the seed file write step (~28s), holding an unnecessary Chrome/Chromium instance while the agent was doing pure text work.

**Fix:** Added an explicit `browser_close` call immediately after `generator_read_log` returns — before any file writes begin. The recorded log contains all selectors; the browser is no longer needed.

```
generator_read_log  →  browser_close  →  generator_write_test (~28s)  →  planner_save_plan
```

**Files changed:**
- `packages/plugin/.claude_agents/playwright/playwright-test-planner.md`

---

## 6. Write Tool Shows Filename in Real Time

**Problem:** Long `Write` tool calls (e.g., writing the seed file took ~28s) showed only `[tool] Write — started` in the log with no context on what was being written.

**Fix:** Updated `event-parser.ts` in `claude-runner` to delay `tool_start` emission until `content_block_stop` — the point at which the tool's full input JSON is available. The file path is then passed in the `tool_start` event.

In `pipeline.ipc.ts`, `Write` tool calls now display the filename in both the terminal log and the chat stream:

```
[tool] Write → seed.spec.js
📝 Writing `seed.spec.js`...
```

`Edit` tool calls display the filename in the log only (edits are typically fast).

**Files changed:**
- `claude-runner/src/event-parser.ts` — accumulate `input_json_delta`, emit `tool_start` with `input` at `content_block_stop`
- `apps/desktop/src/main/ipc/pipeline.ipc.ts` — use `event.input.file_path` for contextual log/token messages

---

## Summary

| Improvement | Impact |
|-------------|--------|
| Local Playwright MCP binary | −300ms–3s per pipeline run |
| Strict MCP config | Faster startup, no stray MCP connections |
| Shorter system prompt | Fewer input tokens per turn |
| Adaptive exploration (memory + targeted snapshots) | 60–80% fewer browser calls in Phase 4 |
| Browser close before writes | Frees Chrome process ~28s earlier |
| Write tool filename display | Better UX — user sees what is being written |
