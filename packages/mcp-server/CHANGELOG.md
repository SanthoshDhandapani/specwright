# Changelog — @specwright/mcp

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
