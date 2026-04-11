import fs from 'fs';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_explore',
  description:
    'Return a structured exploration plan for a page. Does NOT open a browser — instead provides auth data, known selectors, and step-by-step instructions for using Playwright MCP tools to explore the page.',
  inputSchema: {
    type: 'object',
    properties: {
      pageURL: {
        type: 'string',
        description: 'Full URL to explore (e.g., http://localhost:5173/home).',
      },
      moduleName: {
        type: 'string',
        description: 'Module name with @ prefix (e.g., @HomePage).',
      },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Test scenarios or instructions to guide exploration. Empty array for auto-explore.',
      },
      authRequired: {
        type: 'boolean',
        description: 'Whether the page requires authentication. Default: from AUTH_REQUIRED env var (true if not set).',
      },
    },
    required: ['pageURL', 'moduleName'],
  },
};

export async function handler({ pageURL, moduleName, instructions, authRequired }) {
  const config = getConfig();
  const needsAuth = authRequired !== undefined ? authRequired : config.authRequired;

  // Build auth section
  let authSection;
  if (!needsAuth) {
    authSection = 'NOT_REQUIRED — Page is public, no authentication needed.';
  } else if (config.authStrategy === 'oauth' && config.oauthStorageKey) {
    // OAuth localStorage injection — values read by Node.js, not the LLM.
    // JSON.stringify ensures picture URLs with & or ? are emitted as valid JS string literals.
    const derivedName = config.testUserName ||
      config.testUserEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const script = [
      `var u = {};`,
      `u.name    = ${JSON.stringify(derivedName)};`,
      `u.email   = ${JSON.stringify(config.testUserEmail)};`,
      `u.picture = ${JSON.stringify(config.testUserPicture)};`,
      `localStorage.setItem(${JSON.stringify(config.oauthStorageKey)}, JSON.stringify(u));`,
    ].join('\n');

    authSection = [
      `OAUTH_LOCALSTORAGE — Inject auth directly into localStorage (no popup needed).`,
      ``,
      `Call \`browser_evaluate\` with this exact script (do not modify it):`,
      `\`\`\`javascript`,
      script,
      `\`\`\``,
      ``,
      `Then call \`browser_navigate\` again to reload the app and pick up the auth state.`,
    ].join('\n');
  } else {
    const authDataBlock = buildAuthSection(config);
    if (fs.existsSync(config.authStatePath)) {
      authSection = [
        `AVAILABLE — Auth state found at \`${config.authStatePath}\`. Try navigating directly.`,
        `**If the page redirects to a login page**, the saved auth state may be stale. Use the auth data below to log in.`,
        authDataBlock,
      ].join('\n');
    } else {
      authSection = [`NOT_FOUND — No saved auth state. Authenticate first.`, authDataBlock].join('\n');
    }
  }

  // Check agent memory for known selectors
  let knownSelectors = '(none — first exploration of this module)';
  const memoryPath = `${config.agentMemoryDir}/playwright-test-planner/MEMORY.md`;
  if (fs.existsSync(memoryPath)) {
    const memory = fs.readFileSync(memoryPath, 'utf-8');
    const moduleTag = moduleName.replace('@', '').toLowerCase();
    const moduleRegex = new RegExp(`#{1,3}.*${moduleTag}[\\s\\S]*?(?=\\n#{1,3} |$)`, 'i');
    const match = memory.match(moduleRegex);
    if (match) {
      knownSelectors = match[0].trim();
    }
  }

  // Build exploration instructions
  const instructionsList =
    instructions && instructions.length > 0
      ? instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')
      : '(auto-explore — discover all interactive elements and page structure)';

  const text = [
    `## Exploration Plan: ${moduleName} (${pageURL})`,
    ``,
    `### AUTH_STATUS`,
    authSection,
    ``,
    `### KNOWN_SELECTORS`,
    knownSelectors,
    ``,
    `### EXPLORATION_STEPS`,
    `Execute these Playwright MCP tool calls in order:`,
    ``,
    `1. **Navigate** — \`browser_navigate({ url: "${pageURL}" })\``,
    `2. **Initial snapshot** — \`browser_snapshot()\` — capture the full accessibility tree`,
    `3. **Screenshot** — \`browser_take_screenshot()\` — visual capture of initial state`,
    `4. **Explore interactive elements** — For each button, link, form field, dropdown:`,
    `   - Record the element's selector (from snapshot ref attributes)`,
    `   - Click/interact to discover state changes`,
    `   - \`browser_snapshot()\` after each major interaction`,
    `5. **Explore forms** — If forms exist:`,
    `   - Identify all input fields, their types, and labels`,
    `   - Try filling with test data via \`browser_fill_form()\` or \`browser_type()\``,
    `   - Submit and capture validation/success states`,
    `6. **Explore navigation** — Check tabs, menus, pagination if present`,
    `7. **Final snapshot** — \`browser_snapshot()\` — capture end state`,
    ``,
    `### SELECTOR_DISCOVERY_RULES`,
    `Priority order (use the highest available):`,
    `1. \`getByTestId('...')\` — data-testid attributes`,
    `2. \`getByRole('...', { name: '...' })\` — ARIA roles`,
    `3. \`getByText('...')\` — visible text content`,
    `4. \`getByLabel('...')\` — form labels`,
    `5. \`getByPlaceholder('...')\` — input placeholders`,
    `6. CSS selectors — last resort only`,
    ``,
    `For each element, record:`,
    `- **name** — camelCase key (e.g., submitButton, searchInput)`,
    `- **selector** — Playwright selector string`,
    `- **type** — how discovered (testid/role/text/label/placeholder/css)`,
    `- **tag** — HTML tag (BUTTON, INPUT, etc.)`,
    `- **text** — visible text content`,
    `- **description** — what the element does`,
    `- **validated** — true (confirmed from live browser)`,
    ``,
    `### INSTRUCTIONS_TO_COVER`,
    instructionsList,
    ``,
    `### SCENARIO_DESIGN`,
    `While exploring, identify test scenarios:`,
    `- **Happy path** — primary user flow works correctly`,
    `- **Validation** — required fields, format checks, error messages`,
    `- **Edge cases** — empty state, boundary values, special characters`,
    `- **Negative** — invalid inputs, unauthorized access, error handling`,
    ``,
    `### OUTPUT_FORMAT`,
    `After exploration is complete, call \`e2e_plan\` with:`,
    `\`\`\`json`,
    `{`,
    `  "moduleName": "${moduleName}",`,
    `  "pageURL": "${pageURL}",`,
    `  "selectors": [ ... discovered selectors ... ],`,
    `  "behaviors": { ... page behavior observations ... },`,
    `  "scenarios": [ ... identified test scenarios ... ],`,
    `  "instructions": ${JSON.stringify(instructions || [])}`,
    `}`,
    `\`\`\``,
  ].join('\n');

  return { content: [{ type: 'text', text }] };
}

/**
 * Build auth data section from AUTH_DATA env var or authenticationData.js fallback.
 * Returns credentials + extra auth data as simple key-value pairs.
 * Claude handles the actual login flow — no step-by-step instructions needed.
 */
function buildAuthSection(config) {
  // Layer 1: AUTH_DATA env var
  let data = config.authData;

  // Layer 2: authenticationData.js fallback (extract data only, not flow)
  if (!data) {
    data = extractAuthDataFromFile(config);
  }

  // Layer 3: nothing configured
  if (!data) {
    return '\n**No auth data configured.** Ask the user for login credentials, or set AUTH_DATA in the MCP server env config.';
  }

  const { instructions: authInstructions, ...fields } = data;
  const lines = ['', '**Auth data:**'];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`- ${key}: \`${value}\``);
  }
  if (authInstructions) {
    lines.push('', `**Auth instructions:** ${authInstructions}`);
  }
  lines.push(
    '',
    'Navigate to the login page, use `browser_snapshot` to identify form fields, and complete the login flow using the auth data above.',
  );
  return lines.join('\n');
}

/**
 * Fallback: extract auth data (not flow) from authenticationData.js.
 * Only used when AUTH_DATA env var is not set.
 */
function extractAuthDataFromFile(config) {
  if (!fs.existsSync(config.authDataPath)) return null;
  try {
    const content = fs.readFileSync(config.authDataPath, 'utf-8');
    const data = {};

    // Extract 2FA code
    const codeMatch = content.match(/twoFactor[\s\S]*?code:\s*['"]([^'"]+)['"]/);
    if (codeMatch) data.twoFactorCode = codeMatch[1];

    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}
