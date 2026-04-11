---
name: e2e-desktop-automate
description: Run the E2E test automation pipeline from Claude Desktop — configure, explore pages via Playwright MCP, generate seed files and test plans using the e2e-automation MCP server.
argument-hint: <page-url-or-feature>
---

# E2E Desktop Automation Pipeline

Automate E2E test planning from Claude Desktop by combining two MCP servers:

- **e2e-automation** — project config, seed file generation, test plans
- **microsoft-playwright** — live browser exploration

## Pipeline Overview

```
Phase 1: Initialize — get project config + base URL
Phase 2: Configure — add module entry (or use existing)
Phase 3: Explore — browse the page, discover selectors
Phase 4: Plan — generate seed file + test plan from discoveries
Phase 5: Review — present plan for user approval
```

## MCP Tools Used

### e2e-automation MCP (project orchestration)

| Tool                                 | Purpose                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `mcp__e2e-automation__e2e_configure` | Init setup, read/add config, get base URL + credentials                        |
| `mcp__e2e-automation__e2e_explore`   | Get exploration instructions (auth status, known selectors, step-by-step plan) |
| `mcp__e2e-automation__e2e_plan`      | Write seed.spec.js + plan markdown from discovered selectors                   |
| `mcp__e2e-automation__e2e_status`    | Check pipeline state (config, seed, plans, test results)                       |

### microsoft-playwright MCP (browser exploration)

| Tool                                                  | Purpose                                               |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `mcp__microsoft-playwright__browser_navigate`         | Navigate to page URL                                  |
| `mcp__microsoft-playwright__browser_snapshot`         | Capture accessibility tree (primary exploration tool) |
| `mcp__microsoft-playwright__browser_take_screenshot`  | Visual screenshot capture                             |
| `mcp__microsoft-playwright__browser_click`            | Click elements by ref                                 |
| `mcp__microsoft-playwright__browser_fill_form`        | Fill form fields                                      |
| `mcp__microsoft-playwright__browser_type`             | Type text into elements                               |
| `mcp__microsoft-playwright__browser_evaluate`         | Run JS on page                                        |
| `mcp__microsoft-playwright__browser_select_option`    | Select dropdown options                               |
| `mcp__microsoft-playwright__browser_press_key`        | Press keyboard keys                                   |
| `mcp__microsoft-playwright__browser_hover`            | Hover over elements                                   |
| `mcp__microsoft-playwright__browser_console_messages` | Check console errors                                  |
| `mcp__microsoft-playwright__browser_network_requests` | Check network activity                                |

## Execution Steps

### Phase 1: Initialize

Call `mcp__e2e-automation__e2e_automate` to read `instructions.js` and get the full pipeline plan:

```json
{}
```

This returns all config entries with their module names, page URLs, instructions, and the exact sequence of tool calls to execute for each.

If `instructions.js` doesn't exist or is empty, fall back to `mcp__e2e-automation__e2e_configure` with `action: "init"` to get setup info and ask the user for page URL + instructions.

### Phase 2: Configure

Determine the module name and page URL:

- If user provided a URL (e.g., `http://localhost:5173/home`): derive module name as `@HomePage`
- If user provided a feature name (e.g., "user form"): ask for the URL, derive `@UserForm`
- Ask the user for test instructions, or proceed with auto-explore

Call `mcp__e2e-automation__e2e_configure` with `action: "add"`:

```json
{
  "action": "add",
  "config": {
    "moduleName": "@HomePage",
    "pageURL": "http://localhost:5173/home",
    "instructions": ["user-provided instructions or empty for auto-explore"]
  }
}
```

### Phase 3: Explore

#### Step 3a: Get Exploration Plan

Call `mcp__e2e-automation__e2e_explore` to get the exploration plan:

```json
{
  "pageURL": "http://localhost:5173/home",
  "moduleName": "@HomePage",
  "instructions": [],
  "authRequired": true
}
```

This returns: auth status, known selectors from memory, step-by-step exploration instructions, selector discovery rules, and the output format for Phase 4.

#### Step 3b: Authenticate (if required)

If the page redirects to a login page, or AUTH_STATUS says NOT_FOUND:

1. Use `mcp__microsoft-playwright__browser_snapshot` to identify the login form fields
2. Use the **auth data** from the `e2e_explore` AUTH_STATUS response (email, password, etc.)
3. Fill fields and submit using Playwright MCP tools
4. If prompted for 2FA or verification, use the additional auth data provided (e.g., twoFactorCode)
5. If auth instructions are included in the response, follow them

**CRITICAL:** Use the EXACT credentials from the `e2e_explore` response. Do NOT guess or generate passwords. Claude handles the login flow — no step-by-step instructions are needed, just the data.

If AUTH_STATUS is NOT_REQUIRED, skip this step entirely.
If no auth data is configured, ask the user for credentials.

#### Step 3c: Navigate & Explore

1. **Navigate to target page:**

   ```
   mcp__microsoft-playwright__browser_navigate → { url: "<pageURL>" }
   ```

2. **Capture initial state:**

   ```
   mcp__microsoft-playwright__browser_snapshot → full accessibility tree
   mcp__microsoft-playwright__browser_take_screenshot → { type: "png", fullPage: true }
   ```

3. **Explore interactive elements systematically:**

   For each element visible in the snapshot:
   - **Buttons/Links** — Record ref, text, role. Click to discover state changes:

     ```
     mcp__microsoft-playwright__browser_click → { ref: "<ref>", element: "<description>" }
     mcp__microsoft-playwright__browser_snapshot → capture new state
     ```

   - **Form fields** — Record ref, label, type. Try filling with test data:

     ```
     mcp__microsoft-playwright__browser_fill_form → { fields: [{ name, type, ref, value }] }
     mcp__microsoft-playwright__browser_snapshot → capture validation state
     ```

   - **Dropdowns/Selects** — Record options:

     ```
     mcp__microsoft-playwright__browser_select_option → { ref, element, values }
     ```

   - **Tables/Lists** — Record structure, headers, row count

   - **Navigation** — Check tabs, menus, pagination:
     ```
     mcp__microsoft-playwright__browser_click → menu items
     mcp__microsoft-playwright__browser_snapshot → capture sub-pages
     ```

4. **Check for errors:**

   ```
   mcp__microsoft-playwright__browser_console_messages → { level: "error" }
   ```

5. **Final screenshot:**
   ```
   mcp__microsoft-playwright__browser_take_screenshot → { type: "png" }
   ```

#### Step 3d: Collect Discovered Selectors

As you explore, build a selectors array. For each element:

```json
{
  "name": "submitButton",
  "selector": "getByRole('button', { name: 'Submit' })",
  "type": "role",
  "tag": "BUTTON",
  "text": "Submit",
  "description": "Form submit button",
  "validated": true
}
```

**Selector priority** (derive from snapshot):

1. `getByTestId('...')` — if element has `data-testid` attribute
2. `getByRole('...', { name: '...' })` — from accessibility role + name
3. `getByText('...')` — from visible text
4. `getByLabel('...')` — from associated label
5. `getByPlaceholder('...')` — from placeholder text
6. CSS selector — last resort

Also identify **test scenarios** from the interactions:

- Happy path flows
- Form validation (required fields, format errors)
- Edge cases (empty state, boundary values)
- Negative cases (invalid input, error handling)

### Phase 4: Generate Plan

Call `mcp__e2e-automation__e2e_plan` with all discoveries:

```json
{
  "moduleName": "@HomePage",
  "pageURL": "http://localhost:5173/home",
  "category": "@Modules",
  "selectors": [ ... all discovered selectors ... ],
  "behaviors": {
    "description": "Page with navigation menu, search form, data table",
    "forms": [ ... ],
    "tables": [ ... ]
  },
  "scenarios": [
    {
      "name": "Verify page loads with correct title",
      "steps": ["Navigate to /home", "See heading 'Home'"],
      "type": "happy-path"
    }
  ],
  "instructions": [ ... original instructions ... ]
}
```

This writes:

- `e2e-tests/playwright/generated/seed.spec.js` — validated selectors
- `e2e-tests/plans/{module}-plan.md` — full test plan

### Phase 5: Review & Approve

Present the plan summary to the user:

1. Number of selectors discovered
2. Scenario count and names
3. File paths to seed file and plan
4. Ask:
   - **Approve** — plan is ready for BDD generation (Phase 2 of MCP, future)
   - **View Full Plan** — show the plan markdown content
   - **Modify** — adjust scenarios or re-explore

Call `mcp__e2e-automation__e2e_status` to confirm pipeline state.

## Error Handling

- **Browser not installed:** Call `mcp__microsoft-playwright__browser_install`
- **Page load timeout:** Retry once, then report to user
- **Auth failure:** Report credentials issue, ask user to verify
- **No interactive elements found:** Take screenshot, ask user if page loaded correctly
- **Console errors on page:** Report them but continue exploration

## CRITICAL: Sequential Execution

Execute phases ONE BY ONE. Never skip Phase 3 (exploration) — the selectors must come from a live browser session.

Always close the browser when done:

```
mcp__microsoft-playwright__browser_close
```
