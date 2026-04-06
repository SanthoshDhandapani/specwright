# Specwright — Next Phase Plan

## Goal

Make Specwright visually compelling and demo-ready. Add screenshots, video demos, expand ShowBuff test coverage to showcase the full power of the platform.

---

## 1. Screenshots for README

Capture and add to `docs/screenshots/`:

| Screenshot | Description | Section |
|-----------|-------------|---------|
| `desktop-overview.png` | Full desktop app — 3-panel layout with project loaded | README: Desktop App |
| `desktop-instructions.png` | InstructionsBuilder with a module card filled in | README: Desktop App |
| `desktop-running.png` | Pipeline running — streaming chat + terminal logs + active tool indicator | README: Desktop App |
| `desktop-review.png` | Phase 10 final review with quality score | README: Pipeline |
| `desktop-templates.png` | Right panel showing quick-start + project templates | README: Desktop App |
| `desktop-permissions.png` | Permission prompt (Allow/Deny) for a Bash command | README: Desktop App |
| `claude-desktop-mcp.png` | Claude Desktop with e2e-automation MCP tools visible | README: MCP Server |
| `claude-code-automate.png` | Claude Code CLI running `/e2e-automate` | README: CLI Usage |
| `showbuff-home.png` | ShowBuff home page with year tabs and show cards | README: Demo |
| `showbuff-detail.png` | Show detail page with cast and watchlist | README: Demo |
| `generated-files.png` | VS Code showing generated .feature + steps.js side by side | README: What Gets Generated |

**Add to README** with `![Description](docs/screenshots/filename.png)` under each relevant section.

---

## 2. Demo Videos

Record and host (YouTube or GitHub Releases):

### Video 1: "From URL to Tests in 5 Minutes" (Desktop App)
- Open Specwright, select ShowBuff project
- Insert "Quick Explore" template
- Click Save & Execute
- Watch Phases 1-4 (browser opens, snapshots captured)
- Phase 6: Approve the plan
- Phase 7: BDD files generated
- Open generated .feature file in VS Code
- Run `pnpm test:bdd` — tests pass
- **Duration:** ~5 min

### Video 2: "Claude Code CLI Pipeline" (Terminal)
- `cd show-buff && claude`
- `/e2e-automate`
- Show the 10-phase output
- Show generated files
- `pnpm test:bdd` — tests pass
- **Duration:** ~3 min

### Video 3: "Claude Desktop + MCP Tools" (Claude Desktop)
- Show `claude_desktop_config.json` with e2e-automation + playwright MCPs
- Open Claude Desktop
- `/e2e-desktop-automate http://localhost:5173`
- Watch MCP tools being called (configure, explore with browser, plan)
- Review generated seed file + plan
- **Duration:** ~4 min

### Video 4: "Self-Healing Tests" (CLI)
- Break a selector in steps.js
- Run `pnpm test:bdd` — test fails
- `/e2e-heal` — Claude diagnoses and fixes
- `pnpm test:bdd` — tests pass
- **Duration:** ~2 min

---

## 3. ShowBuff Sign-In Test Cases

ShowBuff has Google OAuth with mock fallback. Add E2E tests for:

### Authentication Module (`@Modules/@Authentication/`)

| Scenario | Flow |
|----------|------|
| Mock sign-in (no Google client ID) | Click "Sign in with Google" → Demo User signed in → avatar visible |
| Sign-out flow | Signed in → click user menu → Sign Out → redirected to home, sign-in button visible |
| Protected route redirect | Not signed in → navigate to `/favorites` → redirected to home or see sign-in prompt |
| Protected route access | Signed in → navigate to `/favorites` → page loads with favorites content |
| User menu displays correctly | Signed in → user menu shows "Demo User" name + avatar |

### How to implement
1. Add `authentication.feature` to `show-buff/e2e-tests/features/playwright-bdd/@Modules/@Authentication/`
2. Add `steps.js` with ShowBuff-specific steps (mock sign-in uses `data-testid="google-signin-button"`)
3. No auth.setup.js needed — ShowBuff uses mock sign-in (no real OAuth)
4. Update `instructions.js` with the Authentication module entry

---

## 4. Additional ShowBuff Test Coverage

### Favorites Module (`@Modules/@Favorites/`)

| Scenario | Flow |
|----------|------|
| Add show to favorites | Home → click heart icon on show card → see success toast |
| View favorites page | Navigate to /favorites → see added show |
| Remove from favorites | Click heart icon again → show removed → favorites page empty |

### Watchlist/Lists Module (`@Modules/@Lists/`)

| Scenario | Flow |
|----------|------|
| Create a new list | My Lists → Create List → enter name → list appears |
| Add show to list | Show detail → "Add to List" dropdown → select list → success |
| Rename a list | My Lists → click rename → enter new name → updated |
| Delete a list | My Lists → click delete → confirm → list removed |

### Navigation & Search (`@Modules/@HomePage/`)

| Scenario | Flow |
|----------|------|
| Year tab switching | Click 2025 tab → shows change → page indicator resets |
| Pagination | Click "Next" → page 2 loads → "Prev" enabled |
| Show card navigation | Click show card → navigated to /show/:id detail page |
| Empty state | Select year with no shows → "No shows found" message |

### Cross-Module Workflow (`@Workflows/@UserJourney/`)

| Scenario | Flow |
|----------|------|
| Precondition: Sign in + create list | Sign in → create "My Watchlist" → save list name |
| Consumer: Add shows and verify | Search shows → add to "My Watchlist" → verify in list page |
| Consumer: Favorites + Lists interaction | Favorite a show → add same show to list → verify both pages show it |

---

## 5. README Enhancements

### Add badges
- npm version badges (already added)
- GitHub stars, forks, issues
- Build status (once CI is set up)

### Add GIF preview
- Record a 15-second GIF of the desktop app pipeline running
- Place at top of README as hero image

### Add "Comparison" section
Compare Specwright with alternatives:

| Feature | Specwright | Playwright Codegen | Testim | Katalon |
|---------|-----------|-------------------|--------|---------|
| Open source | Yes | Yes | No | Partial |
| BDD/Gherkin | Yes | No | No | Yes |
| AI exploration | Yes | No | Yes | No |
| Self-healing | Yes | No | Yes | No |
| Desktop app | Yes | No | Yes | Yes |
| CLI | Yes | Yes | No | Yes |
| MCP integration | Yes | No | No | No |
| Price | Free | Free | $$$$ | $$$$ |

---

## 6. Implementation Order

1. **Screenshots** — Capture while running ShowBuff demo (fastest)
2. **ShowBuff sign-in tests** — Prove auth testing works with mock OAuth
3. **Additional test modules** — Favorites, Lists, Navigation
4. **Demo videos** — Record after all test cases work
5. **README enhancements** — Add screenshots, GIF, comparison table
6. **Cross-module workflow** — Sign in → create list → add shows → verify
