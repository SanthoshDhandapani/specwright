import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_explore',
  annotations: { title: 'E2E Explore' },
  description:
    'Return a self-contained Claude Desktop workflow for exploring a page. Uses only standard `@playwright/mcp` browser tools + built-in `Write`/`Edit` — does NOT rely on project-scoped tools like planner_setup_page.',
  inputSchema: {
    type: 'object',
    properties: {
      pageURL: { type: 'string', description: 'Full URL to explore (e.g. http://localhost:5173/home).' },
      moduleName: { type: 'string', description: 'Module name with @ prefix (e.g. @HomePage).' },
      category: { type: 'string', enum: ['@Modules', '@Workflows'], description: 'Default: @Modules' },
      fileName: { type: 'string', description: 'Output file stem (e.g. homepage). Auto-derived if omitted.' },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Combined test scenarios + guidance. If e2e_process was run (Jira or file input), MERGE the parsed scenarios AND the original config instructions[] here — both inform exploration. Never drop the user\'s config instructions just because Jira/file content is present.',
      },
    },
    required: ['pageURL', 'moduleName'],
  },
};

export async function handler({ pageURL, moduleName, category, fileName, instructions }) {
  const config = getConfig();
  if (!config.projectConfigured) return notConfigured();

  // ── Playwright MCP --output-dir check ────────────────────────────────────
  // Check BEFORE returning exploration instructions so Claude never attempts
  // browser_navigate without a valid output dir (which fails with ENOENT /.playwright-mcp).
  const playwrightWarning = checkPlaywrightOutputDir(config.projectRoot);
  if (playwrightWarning) return playwrightWarning;

  const { projectRoot } = config;
  const cat = category || '@Modules';
  const stem = fileName || moduleName.replace('@', '').toLowerCase();
  const seedFile = path.join(projectRoot, 'e2e-tests/playwright/generated/seed.spec.js');
  const planFile = path.join(projectRoot, 'e2e-tests/plans', `${moduleName.replace('@', '').toLowerCase()}-${stem}-plan.md`);
  const memoryFile = path.join(projectRoot, '.claude/agent-memory/playwright-test-planner/MEMORY.md');
  const envFile = path.join(projectRoot, 'e2e-tests/.env.testing');

  const instrList = (instructions || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n') || '  (auto-explore)';

  const text = [
    `# Phase 4: Exploration — ${moduleName}`,
    ``,
    `## 🔒 CREDENTIAL PRIVACY (non-negotiable)`,
    ``,
    `Credentials in \`e2e-tests/.env.testing\` — including TEST_USER_PASSWORD, TEST_USER_EMAIL, TEST_2FA_CODE, OAUTH_STORAGE_KEY, API tokens, session keys — are WRITE-ONLY for tool calls.`,
    ``,
    `**Strict rules:**`,
    `- ✅ Use credential values silently inside \`browser_evaluate\`, \`browser_type\`, auth scripts`,
    `- ❌ NEVER echo, print, quote, summarise, or list credential values in your chat response`,
    `- ❌ NEVER include credential values in seed files, plan files, memory files, or any committed output`,
    `- ✅ OK to display booleans like "Auth: configured ✓" or field names like "Email: (set)"`,
    `- ❌ NEVER say "Email: automation@example.com" or "Password: qaP@ssw0rd..."`,
    ``,
    `If a phase completes and you want to summarise what you did, describe ACTIONS ("authenticated successfully", "injected localStorage auth") — never the values.`,
    ``,
    `## ⛔ LIVE BROWSER WORK IS MANDATORY`,
    ``,
    `Perform at least one live navigation + snapshot before writing ANY output file. Memory is a hint, not a source of truth.`,
    ``,
    `## Target`,
    `- **Page URL:** ${pageURL}`,
    `- **Module:** ${moduleName}`,
    `- **Category:** ${cat}`,
    `- **File stem:** ${stem}`,
    ``,
    `## Scenarios to cover`,
    instrList,
    ``,
    `## Required outputs (in order)`,
    `1. **Seed file** → \`${seedFile}\``,
    `2. **Plan file** → \`${planFile}\``,
    `3. **Memory file** → \`${memoryFile}\``,
    ``,
    `---`,
    ``,
    `## Step 1: Read memory + authenticate`,
    ``,
    `- \`mcp__specwright__read_file\` path: \`${memoryFile}\` — check if this module's selectors exist`,
    `  - If present → **verification mode**: use memory selectors as a starting point ONLY.`,
    `    ⚠️ Memory is a HINT, NOT a substitute for live exploration.`,
    `    You MUST still perform each scenario from the instructions list:`,
    `    navigate to the page, click interactive elements, fill forms, open dropdowns — one browser`,
    `    interaction per scenario step. Verification mode means you skip re-discovering ALREADY-KNOWN`,
    `    static elements (headings, labels). It does NOT mean one snapshot then done.`,
    `  - If absent → **full exploration**: discover all selectors from scratch (5–20 browser calls)`,
    `- \`mcp__specwright__read_file\` path: \`${envFile}\` — get \`AUTH_STRATEGY\` and auth credentials`,
    `  - If \`AUTH_STRATEGY=oauth\` + \`OAUTH_STORAGE_KEY\` set → use localStorage injection (see Step 2)`,
    `  - If \`AUTH_STRATEGY=email-password\` → login flow via form`,
    `  - If \`AUTH_STRATEGY=none\` or missing → skip authentication`,
    ``,
    `## Step 2: Authenticate (if needed)`,
    ``,
    `For OAuth localStorage injection (bypasses popup):`,
    `\`\`\``,
    `mcp__playwright-test__browser_navigate url: <BASE_URL>`,
    `mcp__playwright-test__browser_evaluate function: |`,
    `  () => {`,
    `    const u = { name: "<TEST_USER_NAME>", email: "<TEST_USER_EMAIL>", picture: "<TEST_USER_PICTURE>" };`,
    `    localStorage.setItem("<OAUTH_STORAGE_KEY>", JSON.stringify(u));`,
    `  }`,
    `mcp__playwright-test__browser_navigate url: <BASE_URL>       # reload to pick up auth`,
    `mcp__playwright-test__browser_snapshot                       # verify signed in`,
    `\`\`\``,
    ``,
    `## Step 3: Explore the target page (live — MANDATORY)`,
    ``,
    `\`\`\``,
    `mcp__playwright-test__browser_navigate url: ${pageURL}`,
    `mcp__playwright-test__browser_snapshot                       # full accessibility tree — your source of truth for selectors`,
    `\`\`\``,
    ``,
    `⚠️ **The snapshot above is step 0 — NOT the end of exploration.**`,
    `You now MUST work through each scenario from the instructions list. For EACH scenario:`,
    `1. Identify the interactive elements involved (forms, buttons, dropdowns, modals)`,
    `2. Perform the actual interaction via browser tools`,
    `3. Take a snapshot AFTER to confirm the expected state`,
    ``,
    `Do NOT skip this per-scenario work even if memory has selectors — memory tells you WHERE to look, not whether the selectors still work.`,
    ``,
    `Then for each scenario above, perform the interaction:`,
    `- Navigation / clicks → \`browser_click\` using refs from the snapshot`,
    `- Form fills → \`browser_type\` or \`browser_fill_form\``,
    `- Dropdowns → \`browser_select_option\``,
    `- Key presses → \`browser_press_key\``,
    `- After interactions that change state → another \`browser_snapshot\` (targeted via \`ref\` when possible)`,
    ``,
    `## Step 4: Discover + validate selectors`,
    ``,
    `For every interactive element involved in the scenarios, record its Playwright locator using this priority:`,
    ``,
    `1. \`getByTestId('...')\` — if \`data-testid\` attributes exist (highest)`,
    `2. \`getByRole('button', { name: '...' })\` — semantic HTML with ARIA`,
    `3. \`getByText('...')\` — unique visible text`,
    `4. \`getByLabel('...')\` — form labels`,
    `5. \`getByPlaceholder('...')\` — input placeholders`,
    `6. CSS / XPath — last resort only`,
    ``,
    `## Step 5: Update memory file`,
    ``,
    `Use \`mcp__specwright__write_file\` to append / update memory at \`${memoryFile}\` with a table:`,
    ``,
    `\`\`\`markdown`,
    `## Key Selectors: ${moduleName} (${pageURL})`,
    `| Element | Selector | Notes |`,
    `| ------- | -------- | ----- |`,
    `| Search box | getByRole("searchbox", { name: "Search" }) | |`,
    `\`\`\``,
    ``,
    `## Step 6: Close the browser`,
    ``,
    `\`mcp__playwright-test__browser_close\``,
    ``,
    `## Step 7: Write the seed file`,
    ``,
    `Use \`mcp__specwright__write_file\` to create \`${seedFile}\` with the structure:`,
    ``,
    '```javascript',
    `import { test, expect } from '@playwright/test';`,
    ``,
    `const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';`,
    `const OAUTH_STORAGE_KEY = process.env.OAUTH_STORAGE_KEY;  // required for oauth strategy`,
    `const TEST_USER_NAME = process.env.TEST_USER_NAME || '';`,
    `const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';`,
    `const TEST_USER_PICTURE = process.env.TEST_USER_PICTURE || '';`,
    ``,
    `test.setTimeout(90000);`,
    ``,
    `async function authenticate(page) {`,
    `  await page.goto(BASE_URL);`,
    `  await page.evaluate(`,
    `    ({ key, user }) => localStorage.setItem(key, JSON.stringify(user)),`,
    `    { key: OAUTH_STORAGE_KEY, user: { name: TEST_USER_NAME, email: TEST_USER_EMAIL, picture: TEST_USER_PICTURE } }`,
    `  );`,
    `  await page.goto(\`\${BASE_URL}${new URL(pageURL).pathname}\`);`,
    `}`,
    ``,
    `test.describe('${moduleName}', () => {`,
    `  test.beforeEach(async ({ page }) => {`,
    `    await authenticate(page);`,
    `  });`,
    ``,
    `  test('TC1: <scenario>', async ({ page }) => {`,
    `    // use selectors discovered above`,
    `    await expect(page.getByTestId('...')).toBeVisible();`,
    `  });`,
    `});`,
    '```',
    ``,
    `⚠️ Do NOT hardcode \`OAUTH_STORAGE_KEY\` with a fallback — it MUST fail loudly if missing.`,
    ``,
    `## Step 8: Write the plan file`,
    ``,
    `Use \`mcp__specwright__write_file\` to create \`${planFile}\` with:`,
    ``,
    `- Module info (name, URL, category, file stem)`,
    `- Discovered selectors table (same as memory)`,
    `- Test scenarios (happy-path, edge-case, negative) with step-by-step instructions, expected outcomes, and success criteria`,
    `- Assumes fresh / blank starting state`,
    `- Scenarios independent and runnable in any order`,
    ``,
    `## Budget`,
    ``,
    `| Mode | Minimum browser calls |`,
    `|------|----------------------|`,
    `| Verification (memory exists) | 1 navigate + 1 snapshot + **1 interaction per instruction** |`,
    `| Full exploration (no memory) | 1 navigate + 1 snapshot + **1 interaction per instruction** + extra discovery |`,
    ``,
    `The minimum is always driven by the **instruction count**, not a fixed number.`,
    `${instructions && instructions.length > 0 ? `This run has **${instructions.length} instruction(s)** — minimum ${instructions.length + 2} browser calls required.` : ''}`,
    ``,
    `## Forbidden shortcuts`,
    ``,
    `- ❌ **Navigate + snapshot → done**: ONE snapshot is never sufficient — you must interact with each scenario`,
    `- ❌ Writing seed/plan/memory based on memory alone without performing the scenario interactions live`,
    `- ❌ Using \`browser_take_screenshot\` for selector discovery (use \`browser_snapshot\` — screenshots don't give refs)`,
    `- ❌ Inventing selectors not seen in snapshot output`,
    `- ❌ Treating "verification mode" as permission to skip scenario interactions`,
    `- ❌ Waiting on \`networkidle\` or deprecated Playwright APIs`,
    ``,
    `## ⛔ If a browser tool fails`,
    ``,
    `**Retry the same tool once.** Most transient failures clear on a retry.`,
    ``,
    `If the retry also fails with a filesystem error (\`ENOENT\`, \`mkdir\`, \`EACCES\`), the MCP client config is missing \`--output-dir\`. Report the exact error to the user and STOP — do NOT:`,
    ``,
    `- ❌ **Do NOT** conclude "the browser is unreachable" or "this Claude session can't reach localhost". Claude Desktop runs locally and the browser IS reachable — the error is purely about where Playwright writes artefacts.`,
    `- ❌ **Do NOT** fall back to reading the project's \`src/\` source code as a substitute for exploration. Static source analysis misses runtime behaviour (auth redirects, API mocks, client-rendered content).`,
    `- ❌ **Do NOT** write the seed/plan/memory from guessed selectors. Stop instead, tell the user the MCP config needs \`--output-dir\`, and wait.`,
    ``,
    `Correct user-facing message when browser tools fail due to filesystem errors:`,
    `> ⚠️ The Playwright MCP server couldn't write to its output directory. Add \`--output-dir <absolute-path>\` to the \`playwright-test\` entry in \`claude_desktop_config.json\`, restart Claude Desktop, and retry.`,
    ``,
    `---`,
    ``,
    `## ⛔ What happens AFTER user approval (CRITICAL — read carefully)`,
    ``,
    `When you finish writing seed + plan + memory, present the plan summary to the user and wait for approval. Once the user types "approve" / "yes" / "proceed":`,
    ``,
    `1. ✅ **Call \`mcp__specwright__e2e_generate\` immediately** — this is Phase 7 (BDD Generation)`,
    `   \`\`\`json`,
    `   { "planFilePath": "${planFile}", "moduleName": "${moduleName}", "category": "${cat}", "fileName": "${stem}" }`,
    `   \`\`\``,
    `   The \`e2e_generate\` tool returns the BDD generation instructions — BDD files go to \`e2e-tests/features/playwright-bdd/${cat}/${moduleName}/\`, NOT to \`e2e-tests/playwright/\`.`,
    ``,
    `2. ❌ **Do NOT re-explore the page** — exploration is complete. The seed file is your source of truth for selectors.`,
    ``,
    `3. ❌ **Do NOT write native Playwright \`.spec.js\` files to \`e2e-tests/playwright/\`** — this framework generates BDD \`.feature\` + \`steps.js\` files via the \`e2e_generate\` tool.`,
    ``,
    `4. ❌ **Do NOT write BDD files manually with the Write tool before calling \`e2e_generate\`** — the tool returns the correct paths, conventions, and system prompt for generation.`,
    ``,
    `5. ❌ **Do NOT investigate "Playwright MCP filesystem config issues"** — use the tools as they are; re-try if a single call fails.`,
  ].join('\n');

  return { content: [{ type: 'text', text }] };
}

function notConfigured() {
  return {
    content: [{
      type: 'text',
      text: '⚠️ Project not configured. Call `e2e_configure` with `action: "set_project"` first.',
    }],
  };
}

// Returns an MCP error response if playwright-test MCP is missing --output-dir,
// null if everything is correctly configured.
function checkPlaywrightOutputDir(projectRoot) {
  const os = process.platform;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const desktopConfigPath = os === 'darwin'
    ? path.join(home, 'Library/Application Support/Claude/claude_desktop_config.json')
    : path.join(home, 'AppData/Roaming/Claude/claude_desktop_config.json');

  let desktopConfig = null;
  try {
    desktopConfig = JSON.parse(fs.readFileSync(desktopConfigPath, 'utf-8'));
  } catch {
    return null; // Can't read config — don't block, let it fail naturally
  }

  const servers = desktopConfig?.mcpServers || {};
  const pwEntry = servers['playwright-test'];
  // Use /tmp/playwright-mcp — universal path that works across all projects
  // without embedding a project-specific path in the global claude_desktop_config.json
  const outputDir = '/tmp/playwright-mcp';

  const snippet = JSON.stringify({
    'playwright-test': {
      command: 'npx',
      args: ['@playwright/mcp@latest', '--output-dir', outputDir],
    },
  }, null, 2);

  const fixSteps = [
    `1. Open \`~/Library/Application Support/Claude/claude_desktop_config.json\``,
    `2. Add or update the \`playwright-test\` entry in \`mcpServers\`:`,
    '```json',
    snippet,
    '```',
    `3. Save and **restart Claude Desktop**`,
    `4. Say "retry" — the project is still configured and exploration will start immediately`,
  ].join('\n');

  // Check if playwright is installed under a different key name
  const wrongKeyNames = Object.keys(servers).filter(
    (k) => k !== 'playwright-test' && (
      k.toLowerCase().includes('playwright') ||
      (servers[k]?.args || []).some((a) => a.includes('@playwright/mcp'))
    )
  );

  if (!pwEntry) {
    const wrongKeyHint = wrongKeyNames.length > 0
      ? [
          ``,
          `> **Already have Playwright installed?** Found an entry named \`${wrongKeyNames[0]}\` in your config.`,
          `> The key name MUST be \`playwright-test\` — Specwright tools use \`mcp__playwright-test__*\` prefixes.`,
          `> Rename the key from \`"${wrongKeyNames[0]}"\` to \`"playwright-test"\` and add \`--output-dir\`.`,
        ].join('\n')
      : '';

    return {
      content: [{
        type: 'text',
        text: [
          `## ⛔ Browser exploration blocked — \`playwright-test\` MCP not configured`,
          ``,
          `Claude Desktop needs an MCP entry named exactly \`playwright-test\` to open a browser.`,
          `The key name is not flexible — Specwright pipeline tools call \`mcp__playwright-test__browser_navigate\`,`,
          `\`mcp__playwright-test__browser_snapshot\`, etc., which only resolve when the key is \`playwright-test\`.`,
          wrongKeyHint,
          ``,
          fixSteps,
          ``,
          `> **Why \`--output-dir\`?** Claude Desktop starts the Playwright MCP from the system root (\`/\`),`,
          `> so a relative \`.playwright-mcp\` resolves to \`/.playwright-mcp\` and fails with \`ENOENT\`.`,
        ].join('\n'),
      }],
    };
  }

  const args = pwEntry.args || [];
  if (!args.includes('--output-dir')) {
    return {
      content: [{
        type: 'text',
        text: [
          `## ⛔ Browser exploration blocked — \`playwright-test\` MCP missing \`--output-dir\``,
          ``,
          `The \`playwright-test\` MCP is registered but has no \`--output-dir\`.`,
          `Without it, the server defaults to \`/.playwright-mcp\` (root) and fails with \`ENOENT\`.`,
          ``,
          fixSteps,
        ].join('\n'),
      }],
    };
  }

  return null;
}
