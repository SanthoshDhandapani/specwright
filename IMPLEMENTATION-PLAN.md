# Specwright — Implementation Plan

## Vision

**Specwright** is an open-source, AI-powered E2E test generation platform. Point it at your web app, it explores in a real browser, discovers selectors, and generates production-grade Playwright BDD tests — from a desktop app or CLI.

> No SaaS. No vendor lock-in. Runs locally. Open source.

---

## Why Specwright Exists

**The problem:** Writing E2E tests is slow, brittle, and requires deep knowledge of both the app and the testing framework. Existing tools are either:
- **Manual** — Playwright Codegen records raw actions, no BDD, no data patterns, no healing
- **Proprietary SaaS** — Testim, Mabl, Katalon are expensive with vendor lock-in
- **CLI-only** — Claude Code skills are powerful but require terminal expertise

**The gap:** There's no open-source tool that goes from "here's my app URL" to "here are your BDD tests" with AI-powered exploration, generation, and self-healing.

---

## Architecture

```
specwright/                          (Turbo monorepo, pnpm workspaces)
├── apps/
│   ├── desktop/                     Electron desktop app (React + Zustand + Tailwind)
│   │   ├── src/main/                Electron main process (IPC, services, Agent SDK)
│   │   ├── src/preload/             Context bridge (secure IPC API)
│   │   └── src/renderer/            React UI (ConfigPanel, ChatPanel, TerminalPanel)
│   └── examples/
│       └── show-buff/               Demo TV show app (TVMaze API + Google OAuth)
│
├── packages/
│   ├── agent-runner/                Claude Agent SDK wrapper (streaming, permissions, MCP)
│   ├── plugin/                      Drop-in E2E framework plugin (Playwright BDD + agents)
│   └── mcp-server/                  MCP server for Claude Code/Desktop integration
│
├── docs/                            Documentation
├── LICENSE                          MIT
└── README.md
```

### Three Products, One Repo

| Product | Who it's for | How they use it |
|---------|-------------|-----------------|
| **Plugin** (`@specwright/plugin`) | Developers with Claude Code CLI | `npx @specwright/plugin init` → `/e2e-automate` |
| **Desktop App** (`apps/desktop`) | QA engineers, non-CLI users | Visual UI → click Generate |
| **MCP Server** (`@specwright/mcp-server`) | Claude Code/Desktop users | MCP tools + Playwright MCP |

All three share the same E2E framework (fixtures, shared steps, data persistence, agent prompts). The desktop app and MCP server are optional — the plugin works standalone with Claude Code CLI.

---

## Current State (as of 2026-04-07)

### What Works

- **Plugin** (`@specwright/plugin@0.1.5`) — installs into any React app, includes:
  - 8 agents, 8 skills (including `/e2e-desktop-automate`), 5 rules
  - Shared steps, fixtures, auth setup, 3-layer data persistence
  - `.mcp.json` auto-generated pointing to `npx @specwright/mcp-server`
  - Interactive `--skip-auth` / `--with-auth` option during init
  - All org-specific references removed (generic templates)

- **MCP Server** (`@specwright/mcp-server@0.1.0`) — 5 tools:
  - `e2e_configure`, `e2e_explore`, `e2e_plan`, `e2e_status`, `e2e_automate`
  - Works via `npx @specwright/mcp-server` (no local copy needed)

- **Desktop app** — Electron + React UI with:
  - Project picker with Change button
  - Settings panel (App URL, environment, auth, env vars with password masking)
  - InstructionsBuilder (visual editor for instructions.js)
  - Dynamic templates from `instructions.example.js` + custom templates
  - Agent SDK integration (streaming tokens, tool logs)
  - Code-driven browser exploration via `PlaywrightMcpClient` (Phase 4 auto-detection)
  - Active tool indicator in chat bubble during long tool calls
  - Permission prompts (Allow/Deny) with Auto-Approve All toggle
  - Interrupt and Abort buttons
  - Collapsible terminal panel with color-coded logs
  - Context-rich continuation prompts (plan + seed + agent conventions injected)
  - Multi-turn conversation via MessageQueue (user can guide agent mid-session)
  - URL validation on save (relative paths auto-prepend BASE_URL)

- **Agent runner** (`packages/agent-runner`) — Claude Agent SDK wrapper with:
  - Dynamic ESM import (new Function trick for CJS compatibility)
  - `canUseTool` always provided (auto-approves when skipPermissions on, handles MCP consent)
  - `onExplore` callback — Phase 4 detection in streamed text triggers `PlaywrightMcpClient`
  - `PlaywrightMcpClient` — programmatic MCP client for browser automation from code
  - Tool input streaming (extracts file_path/command for meaningful logs)
  - MessageQueue for multi-turn conversations
  - Interrupt and abort support

- **Show-Buff** (`apps/examples/show-buff`) — Demo TV show app with:
  - TVMaze API integration, Google OAuth (mock fallback)
  - Custom Watchlists CRUD, year-based pagination
  - Full data-testid coverage for E2E testing
  - Working E2E pipeline: explore → plan → approve → generate

### Known Issues

1. **Pipeline stepper phase detection unreliable** — Claude's progress listing contains all phase names, causing false matches. Stepper component is parked (commented out). Tool-event-based detection is wired but not fully reliable. Options:
   - Require Claude to output a machine-readable phase marker (e.g., `<!-- PHASE:3 -->`)
   - Parse tool call patterns (Skill/Agent invocations)

2. **Skills not registered in Agent SDK sessions** — The SDK doesn't auto-discover `.claude/skills/`. Claude executes the pipeline inline from the system prompt, which works but is less structured than skill-chained execution.

3. **Second session re-reads project** — Even with context injection, Claude sometimes re-reads files. The continuation prompt explicitly says "DO NOT re-read" but Claude doesn't always comply.

4. **e2e-process Skill slow for text mode (~98s)** — The `input-processor` agent declares `mcp_servers: [markitdown]` unconditionally. This forces markitdown MCP initialization (~90s) even for text-mode processing where markitdown is never used. **Fix:** Remove `mcp_servers: [markitdown]` from `input-processor.md` frontmatter. Markitdown is only needed for file mode (Excel, CSV, PDF). For text/Jira mode, the agent runs without MCP — should drop to <5s. Affects: `packages/plugin/.claude_agents/input-processor.md` and `apps/examples/show-buff/.claude/agents/input-processor.md`.

5. **Managed hooks block SDK prompts silently** — Org-managed hooks (e.g., FourKites `UserPromptSubmit` requiring Jira ticket IDs) can silently block SDK prompts, returning `{"decision":"block"}` with 0 API tokens and $0 cost. **Fixed:** `ClaudeAgentRunner` now detects hook blocks via `includeHookEvents: true`, emits the block reason as visible chat text ("Blocked by policy: ..."), and throws on result with 0 tokens.

6. **Auto-Approve requires `permissionMode: "bypassPermissions"`** — The Agent SDK v0.1.0+ needs both `permissionMode: "bypassPermissions"` AND `allowDangerouslySkipPermissions: true` for full auto-approve. Previously only `allowDangerouslySkipPermissions` was set, causing Bash/mkdir prompts even with Auto-Approve toggled on. **Fixed.**

---

## Implementation Phases

### Phase 1: Stabilize Core ✅ Complete

**Goal:** Make the desktop app reliable for demo and internal use.

- [x] Agent SDK integration (replace CLI spawning)
- [x] Permission prompts (Allow/Deny) with Auto-Approve All
- [x] MCP server injection (Playwright + project's .mcp.json)
- [x] Code-driven browser exploration (PlaywrightMcpClient + Phase 4 auto-detection)
- [x] Instructions.js reader/writer (JS syntax, single quotes)
- [x] Dynamic templates from instructions.example.js
- [x] Custom user templates (save/load/delete)
- [x] Context-rich continuation prompts
- [x] Multi-turn conversation via MessageQueue
- [x] Collapsible terminal
- [x] Active tool indicator in chat bubble
- [x] Password masking for sensitive env vars
- [x] URL validation
- [x] Standardized instructions.js path (e2e-tests/instructions.js)
- [x] Seed file template in plugin
- [x] Session continuity via MessageQueue (user messages push into active session)
- [ ] Pipeline stepper (reliable phase detection — parked, low priority)

### Phase 2: Generic Framework — In Progress

**Goal:** Remove org-specific code, make it work for any web app.

- [x] Remove FourKites references from plugin (agent prompts, example files, rules)
- [x] Auth opt-in/opt-out (`--skip-auth` flag + interactive prompt)
- [x] `.mcp.json` auto-generated by plugin installer
- [x] Adaptive quality scoring (skipped phases don't penalize score)
- [x] Markdown review format (no ASCII box art)
- [ ] Auth abstraction — configurable login flow templates (email+password, single form, OAuth, no auth)
- [ ] Route configuration — dynamic route editor instead of hardcoded testConfig.js
- [ ] Agent prompts — detect project stack from package.json (not assume Zustand/Tailwind)
- [ ] Framework support — Vue, Angular, Next.js, Svelte (BDD layer is already framework-independent)

### Phase 3: Open-Source Release — In Progress

**Goal:** Public GitHub repo with proper packaging and documentation.

- [x] GitHub repo: github.com/SanthoshDhandapani/specwright
- [x] npm: `@specwright/plugin@0.1.5` (8 agents, 8 skills, MCP config, auth opt-in)
- [x] npm: `@specwright/mcp-server@0.1.0` (5 tools, works via npx)
- [x] Show-Buff demo app with full data-testid coverage
- [ ] Electron distribution: electron-builder for macOS (.dmg), Windows (.exe), Linux (.AppImage)
- [ ] CI/CD: GitHub Actions for build + test + release
- [ ] Documentation: getting started, plugin guide, desktop guide, architecture deep-dive, contributing guide
- [ ] Issue templates, PR template
- [ ] Auto-update via GitHub Releases
- [ ] npm: `@specwright/agent-runner` (for third-party integrations — low priority, consider later)

### Phase 4: Community & Growth

**Goal:** Build adoption and community contributions.

- [ ] Landing page (specwright.dev)
- [ ] Demo video showing full pipeline (explore → approve → generate → tests pass)
- [ ] Blog post / Dev.to article
- [ ] Discord/Slack community
- [ ] Non-React framework templates (Vue, Angular, Svelte)
- [ ] Visual test editor (edit .feature files in the app)
- [ ] Test result history/dashboard
- [ ] @assistant-ui/react integration for richer chat UI (markdown, tool call cards)

---

## Technical Decisions

### Why Agent SDK over CLI spawning

| Aspect | CLI spawning (old) | Agent SDK (current) |
|--------|-------------------|-------------------|
| Streaming | Parse stdout JSON manually | Native async iterator |
| Permissions | `--dangerously-skip-permissions` (unsafe) or blocked | `canUseTool` callback (per-tool approval) |
| MCP servers | Inherits all global MCPs (slow) | Explicit `mcpServers` config |
| Multi-turn | stdin write (unreliable) | MessageQueue async iteration |
| Browser exploration | Relies on Claude calling MCP tools (unreliable) | Code-driven via PlaywrightMcpClient |
| Auth | Uses CLI login session | Uses CLI login session (same) |
| ESM compat | N/A | Requires dynamic import() trick |

### Why Code-Driven Browser Exploration

Claude consistently refused to call Playwright MCP tools directly (interpreting MCP consent responses as "permission required" and falling back to cached memory). After 5+ prompt engineering attempts, we moved exploration to code:

1. `ClaudeAgentRunner` monitors streamed text for Phase 4 + URL pattern
2. `onExplore` callback triggers `PlaywrightMcpClient.explore(url)`
3. Snapshot results injected into conversation via `messageQueue.push()`
4. Claude receives real page data and writes seed file + plan

This is faster, deterministic, and doesn't depend on Claude's willingness to call tools.

### Why Playwright BDD over vanilla Playwright

- **Gherkin** is readable by non-developers (QA, PMs, stakeholders)
- **Path-based tag scoping** (playwright-bdd v8+) provides clean test organization
- **processDataTable** pattern handles data-driven tests declaratively
- **3-layer data persistence** enables cross-feature workflows
- **Shared steps** prevent duplication across modules

### Why Electron over Web

- **File system access** — reads/writes project files directly
- **Process spawning** — runs Claude Agent SDK in Node.js main process
- **MCP servers** — spawns local MCP processes
- **No server needed** — everything runs locally, no cloud dependency
- **Cross-platform** — macOS, Windows, Linux from one codebase

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/agent-runner/src/ClaudeAgentRunner.ts` | Agent SDK wrapper — streaming, permissions, MCP, Phase 4 detection |
| `packages/agent-runner/src/PlaywrightMcpClient.ts` | Programmatic MCP client for browser exploration |
| `apps/desktop/src/main/ipc/pipeline.ipc.ts` | Pipeline orchestration — system prompt, env injection, onExplore callback |
| `apps/desktop/src/main/services/ProjectService.ts` | File I/O — instructions, templates, env vars, orchestrator prompt |
| `apps/desktop/src/main/resources/agents/orchestrator.md` | System prompt for desktop pipeline |
| `apps/desktop/src/renderer/src/components/CenterPanel/CenterPanel.tsx` | Main UI — agent output, phase detection, IPC wiring |
| `apps/desktop/src/renderer/src/components/CenterPanel/InstructionsBuilder.tsx` | Visual instructions.js editor |
| `apps/desktop/src/renderer/src/components/RightPanel/TemplatePanel.tsx` | Dynamic templates (example + custom) |
| `apps/desktop/src/renderer/src/store/pipeline.store.ts` | Pipeline state — phases, messages, logs, permissions, activeTool |
| `packages/plugin/cli.js` | Plugin CLI — `npx @specwright/plugin init` |
| `packages/plugin/install.sh` | Plugin installer — copies agents, skills, rules, e2e framework, .mcp.json |
| `packages/mcp-server/index.js` | MCP server entry — 5 tools for E2E automation |
