# Split-Auth — Sign In Remotely, Test Locally

## When to use this

You want to run E2E tests against `http://localhost:<port>` (so V8 code
coverage instruments your local sources), but the **real signin flow only
works on a hosted environment** because:

- Identity provider redirects whitelist only the hosted domain
- 2FA / SSO providers reject `localhost` callbacks
- Backend session/CSRF cookies are bound to `*.your-company.com`

Split-auth lets the **setup project** sign in against the hosted host, then
hands the captured tokens to the **rest of the suite** running against the
local dev server.

## How it works

```
┌───────────────────────────────────────────────────────────────┐
│  auth.setup.js                                                 │
│  ─────────────                                                 │
│  1. navigate AUTH_BASE_URL/signin   (e.g. auth.example.com) │
│  2. real signin (2FA, SSO, etc.)                               │
│  3. page.context().storageState() → captures cookies+localStorage
│  4. REWRITE: move origins[].origin  AUTH_BASE_URL → BASE_URL   │
│  5. STRIP: cookies whose domain doesn't match BASE_URL         │
│  6. save user.json                                             │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│  All other projects                                             │
│  (main-e2e, serial-execution, workflow-consumers, …)            │
│  ─────────────                                                  │
│  - baseURL = BASE_URL (e.g. http://localhost:3000)              │
│  - storageState = the rewritten user.json                       │
│  - Local app reads tokens from localhost localStorage           │
│  - API calls go cross-origin to hosted backends                 │
│  - Chromium launched with --disable-web-security to bypass CORS │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│  auth-tests project (the @Authentication/*.spec.js scenarios)  │
│  ─────────────                                                 │
│  - baseURL = AUTH_BASE_URL                                      │
│  - No storageState (clean state — exercises real signin UI)     │
│  - Won't race against the local app shell at BASE_URL/signin    │
└───────────────────────────────────────────────────────────────┘
```

## Configuration

### `e2e-tests/.env.testing`

```bash
# Where tests RUN (local dev for coverage)
BASE_URL=http://localhost:3000

# Where signin happens (hosted env where real auth works).
# Leave commented for single-origin auth.
AUTH_BASE_URL=https://auth.example.com

# Required when AUTH_BASE_URL ≠ BASE_URL: relax browser CORS so the local
# app at BASE_URL can call hosted backends with the captured tokens.
# Chromium treats Origin as a forbidden header — overriding it from
# Playwright code is not reliable, so we disable the check at the
# browser launch level instead.
CHROME_ARGS="--no-sandbox,--disable-dev-shm-usage,--disable-web-security,--disable-features=IsolateOrigins"
```

Single-origin auth (signin and tests on the same host) is the default —
just leave `AUTH_BASE_URL` unset or equal to `BASE_URL`. The strategy
code skips both the rewrite and the cookie strip.

### `playwright.config.ts` — already handled by the base plugin

The `auth-tests` project's `baseURL` automatically prefers `AUTH_BASE_URL`:

```ts
baseURL: process.env.AUTH_BASE_URL || process.env.BASE_URL || 'http://localhost:5173',
```

All other projects inherit `BASE_URL`.

### Auth strategies — already handled by the base plugin

`e2e-tests/playwright/auth-strategies/email-password.js` and
`oauth.js` both implement the split-auth flow when `AUTH_BASE_URL` is
set and differs from `BASE_URL`:

1. Sign in at `AUTH_BASE_URL`.
2. Capture `storageState`.
3. Rewrite each `origins[].origin` from the auth host to the app origin.
4. Drop cookies whose domain doesn't match the app host.
5. Persist the rewritten file.

The startup log makes the rewrite visible:

```
[auth:email-password] Split-auth: signin@https://auth.example.com → app@http://localhost:3000
[auth:email-password] Split-auth rewrite: origins 2 → 2 (at http://localhost:3000), cookies 23 → 0
```

## Things that don't work and why

| Approach | Why it fails |
|---|---|
| `page.route('**/*', r => r.continue({ headers: { origin: ... } }))` | Origin is a forbidden header — Chromium silently restores the real origin. Also breaks `page.waitForResponse()` because the response event sequence changes. |
| `context.setExtraHTTPHeaders({ origin: ... })` | Same forbidden-header restriction. Trace will show your override, but the wire-level request keeps the real origin. |
| Just sharing the auth token to localhost | Auth itself works (the local app sees the token), but every cross-origin XHR to your hosted backend trips CORS and returns status `-1`. |

`--disable-web-security` is the only dependable way to let
`localhost:<port>` talk to hosted APIs in Chromium. It's an E2E-only
flag — the production app and your QA users are unaffected.

## URL helper convention (`url-config.mjs`)

The plugin ships `e2e-tests/playwright/url-config.mjs` so config, auth
strategies, and step files all read the URLs from one place:

```js
import urlConfig from '../url-config.mjs';
const { getAuthUrl, getAppUrl, isSplitAuth } = urlConfig;
```

- `getAuthUrl()` — where signin runs (`AUTH_BASE_URL` if set, else `BASE_URL`).
- `getAppUrl()`  — where the app under test lives (`BASE_URL`).
- `isSplitAuth()` — `true` when those differ.

### Why `.mjs` and a default-exported object?

Playwright's TypeScript loader transforms ESM helpers into a CJS wrapper
that strips named-export metadata. Named exports from a `.js` helper file
imported by an auth strategy or setup file therefore fail at import-validation
time:

```
SyntaxError: The requested module '../url-config.js' does not provide an export named 'getAppUrl'
ReferenceError: exports is not defined in ES module scope
```

The `.mjs` extension tells transformers to leave the file alone. A default
export of an object additionally bypasses per-name validation entirely
(only `default` is checked). Consumers destructure at runtime, where the
real export object is available. The combination is verified across
Playwright 1.59.x and 1.60.x.

If you need the helpers from a place where `.mjs` can't be imported
(e.g. a step file picked up by playwright-bdd's `.{js,ts}` glob), read
env directly — one line, no abstraction needed:

```js
const BASE_URL = (process.env.AUTH_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
```

## Caveats

- **Token realm:** `AUTH_BASE_URL` must issue tokens the backend you call
  from `BASE_URL` accepts. A hosted staging environment issuing tokens
  for its sibling staging API — works. Mismatched realms (staging token
  sent to a production API) won't.
- **Cookies are dropped.** If your backend requires session cookies in
  addition to a bearer token, split-auth alone is not enough. Use a
  `/etc/hosts` redirect instead (map the hosted hostname to
  `127.0.0.1`) so the browser keeps the cookies on the original domain.
- **`--disable-web-security` profile note.** Older Chrome versions
  required `--user-data-dir` alongside the flag — but Playwright forbids
  `--user-data-dir` in `launch()` (it'd need `launchPersistentContext`).
  Recent Chromium versions accept `--disable-web-security` standalone,
  which is what the base plugin uses.

## Reference: minimal full setup

```bash
# .env.testing
AUTH_STRATEGY=email-password
BASE_URL=http://localhost:3000
AUTH_BASE_URL=https://auth.example.com
TEST_USER_EMAIL=tester@example.com
TEST_USER_PASSWORD=…
CHROME_ARGS="--no-sandbox,--disable-dev-shm-usage,--disable-web-security,--disable-features=IsolateOrigins"
```

```bash
# 1. Start the local dev server (separate terminal)
yarn start

# 2. Run tests
yarn test:bdd:coverage
```

That's it. Setup signs in on the hosted env, tokens land on
localhost, the suite runs locally with `--disable-web-security`
letting cross-origin backend calls through.
