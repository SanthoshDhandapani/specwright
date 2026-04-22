# Changelog — @specwright/mcp

## [0.7.0] — 2026-04-22

### Fixed
- **`e2e_explore` — verification mode was stopping after one snapshot**: The model was reading agent memory, doing a single `browser_navigate` + `browser_snapshot`, then writing seed/plan files without interacting with any scenario. Verification mode now requires one browser interaction per instruction — memory is a selector hint, not a substitute for live verification. Added explicit forbidden shortcut: "Navigate + snapshot → done".
- **`e2e_explore` — budget now instruction-count-driven**: Replaced the fixed "2–5 calls" budget with `1 navigate + 1 snapshot + 1 interaction per instruction`. The rendered instruction shows the exact minimum for each run, preventing the model from satisfying the budget with a trivial snapshot.
- **`e2e_generate` — shared steps inventory dynamically enumerated**: The "DO NOT redefine" section now reads the project's actual `shared/` directory at call time and lists every `Given/When/Then` step signature available. Previously it listed static example names that didn't reflect the project's real shared steps.
- **`e2e_heal` — only one memory file was updated**: Healer previously read/wrote `playwright-test-healer/MEMORY.md` only. Now reads and writes both `playwright-test-healer/MEMORY.md` (selector fixes, anti-patterns) AND `execution-manager/MEMORY.md` (run outcomes, flaky tests, project-level patterns) — matching the two-agent healing pipeline.

### Added
- **`e2e_automate` — □/🔄/✅ progress tracking**: Pipeline now emits an 8-phase visual todo list after each phase. Claude Desktop hides tool results, so the tracker makes pipeline progress visible in the chat without requiring the user to expand tool badges.
- **`e2e_process` — Atlassian MCP gate for Jira URL inputs**: When an `instructions.js` entry has `inputs.jira.url` set, `e2e_process` now checks `claude_desktop_config.json` for an Atlassian MCP entry before proceeding. If missing, returns an actionable error with the exact JSON snippet to add and explains that Claude handles OAuth natively — no token needed.
- **`e2e_explore` — wrong key name detection**: The Playwright MCP check now scans all `mcpServers` entries for any entry that looks like Playwright but is named something other than `playwright-test`. If found, the error message tells the user to rename it rather than install a second copy.
- **`SERVER_INSTRUCTIONS` — run command convention**: Added explicit `@Modules` vs `@Workflows` run command templates and a `NEVER suggest: npx cucumber-js` guard. Prevents the model from hallucinating `npx cucumber-js` (wrong framework) at the end of the pipeline.
- **`SERVER_INSTRUCTIONS` — user-visible output templates**: Added per-phase message templates so Claude Desktop emits a visible summary between every tool call, not just at the end.
- **README — Claude Desktop setup section**: Complete `claude_desktop_config.json` reference (specwright + playwright-test + optional atlassian entries). Documents that `playwright-test` is a mandatory key name (not flexible), why `--output-dir /tmp/playwright-mcp` is required, rename instructions for existing Playwright installations, and when Atlassian MCP is required vs optional.

---

## [0.6.0] — 2026-04-22

### Added
- **Built-in file management tools** — `read_file`, `write_file`, `edit_file`, `list_directory` added directly to the MCP server (modeled on the official `@modelcontextprotocol/server-filesystem`). Claude Desktop has no native Read/Write/Bash tools, so the pipeline instructions previously emitted "Read this file" commands that Claude Desktop couldn't execute (causing `NO_MEMORY` / `NO_ENV` hallucinations). These four tools give Claude Desktop native file access scoped to the configured project root with path-traversal protection.
- **`e2e_explore` and `e2e_generate` updated** — instruction text now references `mcp__specwright__read_file` and `mcp__specwright__write_file` instead of the Claude Code `Read` / `Write` tools.
- **`SERVER_INSTRUCTIONS` file management section** — documents the four file tools and reminds Claude Desktop to use them for all file I/O during the pipeline.
- **Tool preload list updated** — `tool_search` preload query in `SERVER_INSTRUCTIONS` now includes `read_file`, `write_file`, `edit_file`, `list_directory`.

---

## [0.5.0] — 2026-04-22

### Added
- **Keyword activation triggers in SERVER_INSTRUCTIONS** — Claude Desktop now automatically invokes `e2e_automate` when the user mentions any of: "Specwright", "E2E test(s)", "BDD test(s)", "Playwright BDD", "generate tests", "test automation", "feature files", "automate test", "run E2E", "write E2E", "create BDD", or "e2e automate". No manual tool invocation required.
- **Updated `e2e_automate` tool description** — Comprehensive keyword list embedded in the description so Claude's tool selection scoring routes E2E-related prompts to the correct tool automatically.

---

## [0.4.0] — 2026-04-19

### Added
- `e2e_setup` tool — elicitation form for first-time project configuration (project path, base URL, auth strategy, credentials). Stores config in `~/.specwright/config.json`.
- `e2e_configure` tool — update individual config fields after initial setup.
- `e2e_status` tool — display current Specwright config (project path, configured status, auth summary). Masks credential values.
- `e2e_process` tool — Phase 3 routing: fetch Jira tickets via Atlassian MCP tools, convert files via markitdown, extract scenarios, write parsed plan to `e2e-tests/plans/`.
- Graceful degradation when `SPECWRIGHT_PROJECT` is unset — falls back to `PROJECT_ROOT` env var → `~/.specwright/config.json` → empty string. `e2e_automate` returns `NEXT_ACTION: CALL_E2E_SETUP` instead of crashing.
- `SERVER_INSTRUCTIONS` — injected into Claude Desktop's system context at connection time; documents tool invocation order, auth masking policy, and pipeline phases.

### Changed
- `e2e_automate` — now reads `instructions.js` via dynamic `import()` (data URI) instead of JSON parsing; supports full ES module syntax in config files.

---

## [0.3.0] — 2026-04-10

### Added
- Initial MCP server with `e2e_automate` tool — reads `instructions.js`, validates project config, and returns the full pipeline plan with per-entry processing steps.
- Framework conventions appended to pipeline plan output: directory structure, workflow naming, data table patterns, FIELD_TYPES reference, cross-feature data sharing, import patterns, shared steps catalog, tags reference.
- Dynamic shared steps discovery — reads `shared/` directory from configured project and lists available step definitions in the pipeline output.
