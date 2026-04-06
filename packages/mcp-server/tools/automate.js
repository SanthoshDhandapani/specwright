import fs from 'fs';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_automate',
  description:
    'Read instructions.js and return a structured pipeline plan. For each config entry, returns the module name, page URL, instructions, and the sequence of MCP tool calls to execute (explore → plan). Call this first to get the full automation plan.',
  inputSchema: {
    type: 'object',
    properties: {
      entry: {
        type: 'number',
        description: 'Process a specific entry by index (0-based). Omit to get all entries.',
      },
    },
  },
};

export async function handler({ entry }) {
  const config = getConfig();

  if (!fs.existsSync(config.instructionsPath)) {
    return {
      content: [
        {
          type: 'text',
          text: [
            '## No instructions.js found',
            '',
            `Expected at: \`${config.instructionsPath}\``,
            '',
            'Create an instructions.js file with test config entries, or use `e2e_configure` with `action: "add"` to create one.',
            '',
            '### NEXT_ACTION: ASK_USER',
            'Ask the user for the page URL and test instructions to create a config entry.',
          ].join('\n'),
        },
      ],
    };
  }

  // Read instructions.js as text and extract the array
  const content = fs.readFileSync(config.instructionsPath, 'utf-8');

  // Extract entries by parsing the export default array
  // We use a simple approach: import via data URI to evaluate the JS
  let entries;
  try {
    const dataUri = `data:text/javascript;base64,${Buffer.from(content).toString('base64')}`;
    const mod = await import(dataUri);
    entries = mod.default || [];
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Error parsing instructions.js: ${err.message}\n\nCheck the file syntax at \`${config.instructionsPath}\`.`,
        },
      ],
    };
  }

  if (entries.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'instructions.js is empty (no config entries). Use `e2e_configure` with `action: "add"` to add a test config entry.',
        },
      ],
    };
  }

  // Filter to specific entry if requested
  const toProcess = entry !== undefined ? [entries[entry]].filter(Boolean) : entries;

  if (toProcess.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `Entry index ${entry} not found. instructions.js has ${entries.length} entries (0-${entries.length - 1}).`,
        },
      ],
    };
  }

  // Build pipeline plan for each entry
  const sections = toProcess.map((e, i) => {
    const idx = entry !== undefined ? entry : i;
    const instructionsList =
      e.instructions && e.instructions.length > 0
        ? e.instructions.map((inst, j) => `${j + 1}. ${inst}`).join('\n')
        : '(auto-explore)';

    return [
      `### Entry ${idx + 1}: ${e.moduleName} (${e.category || '@Modules'})`,
      `**Page URL:** ${e.pageURL}`,
      e.subModuleName && e.subModuleName.length > 0 ? `**Sub-modules:** ${e.subModuleName.join(', ')}` : '',
      `**File name:** ${e.fileName || 'auto'}`,
      `**Explore:** ${e.explore !== false ? 'Yes' : 'No'}`,
      ``,
      `**Instructions:**`,
      instructionsList,
      ``,
      `**Execute these steps in order:**`,
      `1. Call \`e2e_explore\` with:`,
      `   - pageURL: \`${e.pageURL}\``,
      `   - moduleName: \`${e.moduleName}\``,
      `   - instructions: ${JSON.stringify(e.instructions || [])}`,
      `2. Follow the exploration plan using Playwright MCP tools (browser_navigate, browser_snapshot, browser_click, etc.)`,
      `3. Call \`e2e_plan\` with discovered selectors, behaviors, and scenarios`,
      `4. Present the plan to the user for approval`,
    ]
      .filter(Boolean)
      .join('\n');
  });

  const text = [
    `## E2E Automation Pipeline`,
    ``,
    `**Entries:** ${toProcess.length} config(s) to process`,
    `**Auth required:** ${config.authRequired ? 'Yes' : 'No'}`,
    config.authData
      ? `**Auth data:** configured (${Object.keys(config.authData)
          .filter((k) => k !== 'instructions')
          .join(', ')})`
      : '',
    ``,
    `---`,
    ``,
    sections.join('\n\n---\n\n'),
    ``,
    `---`,
    ``,
    `### Pipeline Instructions`,
    `Process each entry sequentially. For each entry:`,
    `1. Call \`e2e_explore\` to get the exploration plan`,
    `2. Authenticate if needed (use auth data from explore response)`,
    `3. Explore the page using Playwright MCP tools`,
    `4. Call \`e2e_plan\` with discoveries`,
    `5. Present plan for approval before moving to next entry`,
    ``,
    `---`,
    ``,
    ...getFrameworkConventions(config),
  ]
    .filter(Boolean)
    .join('\n');

  return { content: [{ type: 'text', text }] };
}

/**
 * Return framework conventions that Claude Desktop needs to generate
 * proper BDD code. Read from project files when available, otherwise
 * return static conventions.
 */
function getFrameworkConventions(config) {
  const lines = [
    `### Framework Conventions (MUST follow when generating code)`,
    ``,
    `#### Directory Structure`,
    `- \`@Modules/\` — single-page tests (e.g., @Modules/@HomePage/)`,
    `- \`@Workflows/\` — cross-page tests with precondition/consumer pattern`,
    `- \`shared/\` — globally scoped steps (no @ prefix). Reusable across all modules.`,
    `- Steps needed by ONE module → co-locate as \`steps.js\` next to the \`.feature\` file`,
    `- Steps needed by MULTIPLE modules → place in \`shared/\``,
    ``,
    `#### Workflow Naming (numbered prefixes for execution order)`,
    `- Precondition: \`@0-PreconditionName/\` (runs first, tagged \`@precondition @cross-feature-data @serial-execution\`)`,
    `- Consumer 1: \`@1-ConsumerName/\` (tagged \`@workflow-consumer\`, NO @serial-execution)`,
    `- Consumer 2: \`@2-ConsumerName/\` (tagged \`@workflow-consumer\`)`,
    `- The numbered prefix ensures filesystem ordering within serial execution`,
    ``,
    `#### Data Table Pattern (3-column Gherkin tables)`,
    `All form fills and assertions use 3-column data tables:`,
    '```gherkin',
    `| Field Name | Value           | Type            |`,
    `| Name       | <gen_test_data> | SharedGenerated |`,
    `| Email      | <gen_test_data> | SharedGenerated |`,
    '```',
    `- \`<gen_test_data>\` — generates a faker value and caches it (use in form fill steps)`,
    `- \`<from_test_data>\` — reads the previously cached value (use in assertion steps)`,
    `- \`Static\` type — use a known value as-is`,
    `- \`SharedGenerated\` type — value is shared across scenarios via cache`,
    ``,
    `#### Test Data Generation (faker)`,
    `- ALWAYS use \`@faker-js/faker\` via \`processDataTable\` — NEVER use \`Date.now()\` or manual timestamps`,
    `- Import: \`import { processDataTable, validateExpectations, FIELD_TYPES } from '../path/to/utils/stepHelpers.js'\``,
    `- \`processDataTable(page, dataTable, { mapping, fieldConfig })\` fills forms from data tables`,
    `- \`validateExpectations(page, dataTable, { mapping, validationConfig, container })\` asserts displayed values`,
    ``,
    `#### FIELD_TYPES (for fieldConfig)`,
    `- \`FILL\` — plain text input`,
    `- \`DROPDOWN\` — react-select dropdown`,
    `- \`CHECKBOX_TOGGLE\` — checkbox by label`,
    `- \`CLICK\` — button/toggle via click`,
    `- \`CUSTOM\` — use fieldHandlers for unique interactions`,
    ``,
    `#### Validation Types (for validationConfig)`,
    `- \`TEXT_VISIBLE\` — assert text is visible by testID`,
    `- \`INPUT_VALUE\` — assert input .value`,
    ``,
    `#### Cross-Feature Data Sharing`,
    `- Precondition saves: \`saveScopedTestData('scopename', { key: value })\``,
    `- Consumer loads: \`Given I load predata from "scopename"\` (shared step in shared/common.steps.js)`,
    `- Scope name = lowercase workflow name (e.g., "userworkflow", "bookingworkflow")`,
    `- Also hydrate in-memory cache: \`globalThis.__rt_featureDataCache[scope] = data\``,
    `- DO NOT redefine "I load predata from {string}" in consumer steps — it's in shared/common.steps.js`,
    ``,
    `#### Import Pattern`,
    `Always import from fixtures, never from playwright-bdd directly:`,
    '```javascript',
    `import { Given, When, Then, expect } from '../path/to/playwright/fixtures.js';`,
    `import { saveScopedTestData } from '../path/to/playwright/fixtures.js';`,
    '```',
    ``,
    `#### Shared Steps Already Available (DO NOT redefine)`,
  ];

  // Read shared steps to list what's available
  const sharedDir = `${config.featuresDir}/shared`;
  if (fs.existsSync(sharedDir)) {
    const sharedFiles = fs.readdirSync(sharedDir).filter((f) => f.endsWith('.js'));
    for (const file of sharedFiles) {
      try {
        const content = fs.readFileSync(`${sharedDir}/${file}`, 'utf-8');
        const stepMatches = content.match(/(Given|When|Then)\(['"]([^'"]+)['"]/g);
        if (stepMatches) {
          lines.push(`**${file}:**`);
          for (const match of stepMatches) {
            const stepText = match.match(/(Given|When|Then)\(['"]([^'"]+)['"]/);
            if (stepText) {
              lines.push(`- \`${stepText[1]} ${stepText[2]}\``);
            }
          }
          lines.push('');
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  lines.push(
    `#### Tags Reference`,
    `| Tag | Purpose | Project |`,
    `|-----|---------|---------|`,
    `| \`@precondition\` | Workflow setup, runs first | precondition (1 worker) |`,
    `| \`@workflow-consumer\` | Consumes predata, runs after preconditions | workflow-consumers (parallel) |`,
    `| \`@cross-feature-data\` | Feature shares data across features | precondition project |`,
    `| \`@serial-execution\` | Non-workflow serial tests | serial-execution (1 worker) |`,
    `| \`@modulename\` | Module tag (lowercase, e.g., @homepage) | All features |`,
    `| No execution tag | Default parallel | main-e2e |`,
  );

  return lines;
}
