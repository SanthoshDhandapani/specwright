---
name: e2e-plan
description: Create a test plan for a web page or feature using browser exploration, selector discovery, and scenario design.
argument-hint: <page-url-or-feature>
context: fork
agent: playwright-test-planner
hooks:
  PreToolUse:
    - matcher: Bash
      module: "@specwright/hooks/validate-bash"
      config:
        blockDestructive: true
---

# Test Planning Skill

Create a comprehensive test plan by exploring the application in a real browser.

## STEP 0: Authentication (MANDATORY — do this BEFORE anything else)

Read `e2e-tests/.env.testing` in the project root to check the authentication strategy:

```
AUTH_STRATEGY=oauth | email-password | none
```

**If `AUTH_STRATEGY` is `oauth`:**

Check `e2e-tests/.env.testing` for `OAUTH_STORAGE_KEY`:

If `OAUTH_STORAGE_KEY` is set (bypasses OAuth popup — preferred):
1. Read `e2e-tests/.env.testing` → get `TEST_USER_EMAIL`, `TEST_USER_NAME` (optional), `OAUTH_STORAGE_KEY`, `BASE_URL`
2. Derive `name` from `TEST_USER_NAME` or from `TEST_USER_EMAIL` (split at @, titlecase)
3. Use `browser_navigate` to go to `{BASE_URL}`
4. Use `browser_evaluate` to inject: `localStorage.setItem("{OAUTH_STORAGE_KEY}", JSON.stringify({ name, email: TEST_USER_EMAIL, picture: "" }))`
   (picture field will be auto-generated as SVG initials by the runtime — passing "" is fine)
5. Use `browser_navigate` to reload `{BASE_URL}` (picks up auth state)
6. Use `browser_snapshot` to verify signed in (user avatar visible, sign-in button gone)

If only `OAUTH_BUTTON_TEST_ID` is set (click-based sign-in):
1. Read `OAUTH_SIGNIN_PATH` (default: `/signin`) from `.env.testing`
2. Use `browser_navigate` to go to `{BASE_URL}{OAUTH_SIGNIN_PATH}`
3. Use `browser_snapshot` to confirm the sign-in button
4. Use `browser_click` on the button matching `OAUTH_BUTTON_TEST_ID`
5. Use `browser_snapshot` to verify authentication succeeded

If auth fails, stop and ask the user for help.

**If `AUTH_STRATEGY` is `email-password`:**
1. Read `e2e-tests/.env.testing` for `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`
2. Read `e2e-tests/data/authenticationData.js` for login form locators
3. Use `browser_navigate` to go to the sign-in page
4. Use `browser_snapshot`, then `browser_type` to fill email and password
5. Use `browser_click` to submit, then `browser_snapshot` to verify login

**If `AUTH_STRATEGY` is `none` or not set in `.env.testing`:**
- Skip authentication, proceed directly to exploration

**DO NOT explore any page until authentication is complete. If you see a "Sign in" button during exploration, you forgot to authenticate — go back and sign in first.**

## Token Efficiency

Browser exploration should be SURGICAL, not exhaustive:
- Check agent memory FIRST — skip re-discovery of known selectors
- Take ONE full-page snapshot (overview), then targeted snapshots only (with `ref` parameter)
- **Maximum 20 browser calls per module**
- Write seed file as soon as you have sufficient selectors — don't over-explore
- If this is a repeat exploration (memory has data), do verification-only (5 calls max)
- For local projects: optionally grep `src/` for `data-testid` to pre-discover selectors (skip for external URLs or large projects)

## What This Does (after authentication)

1. Opens browser and navigates to the target page
2. Explores UI elements via MCP browser tools (budget: 20 calls max)
3. Discovers and validates selectors (priority: testId > role > text > label)
4. Identifies testable scenarios (happy path, edge cases, negative)
5. Generates a structured test plan + seed file with validated selectors
6. **Updates agent memory** with ALL discovered selectors and patterns

## Usage

```
/e2e-plan /home                        # Plan tests for a page
/e2e-plan http://localhost:5173/users  # Plan tests for a URL
/e2e-plan "Login flow"                  # Plan tests for a feature
```

## Input: $ARGUMENTS

Pass the page URL or feature description to plan tests for.

## Output (3 required)

1. **Seed file**: `e2e-tests/playwright/generated/seed.spec.js` (validated selectors)
2. **Test plan**: `e2e-tests/plans/{feature}-plan.md` (scenarios, steps, data dependencies)
3. **Memory update**: `.claude/agent-memory/playwright-test-planner/MEMORY.md` — ALL discovered selectors, navigation paths, reusable patterns, and known limitations written to the memory file
