import fs from 'fs';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_automate',
  annotations: { title: 'E2E Automate' },
  description:
    'Specwright E2E test automation pipeline entry point. Call this tool whenever the user mentions: Specwright, E2E tests, BDD tests, Playwright BDD, generate tests, test automation, feature files, or BDD scenarios. ⚠️ CALL THIS FIRST — do NOT ask the user any questions. Reads instructions.js and returns the pipeline plan if the project is configured, or returns NEXT_ACTION: CALL_E2E_SETUP when it is not.',
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

  if (!config.projectConfigured) {
    const hasRoot = Boolean(config.projectRoot);
    return {
      content: [
        {
          type: 'text',
          text: [
            '## Specwright not set up for this project',
            '',
            hasRoot
              ? `Project path is set to \`${config.projectRoot}\` but no \`.specwright.json\` was found there.`
              : 'No project path is configured.',
            '',
            'To use Specwright, run the following in your project root:',
            '```',
            'npx @specwright/plugin init',
            '```',
            'This creates `.specwright.json` and installs the E2E framework.',
            '',
            '### NEXT_ACTION: CALL_E2E_SETUP',
            'Call `e2e_setup({})` immediately — it will prompt the user for the project path and guide them through setup.',
          ].join('\n'),
        },
      ],
    };
  }

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
            '### NEXT_ACTION: CALL_E2E_SETUP',
            'Call `e2e_setup({})` immediately — do NOT ask the user any questions first. The setup form collects all required pipeline configuration.',
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
          text: [
            '## instructions.js is empty — no config entries found.',
            '',
            '### NEXT_ACTION: CALL_E2E_SETUP',
            'Call `e2e_setup({})` immediately — do NOT ask the user any questions first. The setup form collects all required pipeline configuration.',
          ].join('\n'),
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

    // Detect all present input sources — combinations are valid
    const jiraUrl = e.inputs?.jira?.url;
    const filePath = e.filePath;
    const hasInstructions = e.instructions && e.instructions.length > 0;

    const activeSources = [
      jiraUrl        ? 'Jira'         : null,
      filePath       ? 'File'         : null,
      hasInstructions ? 'Instructions' : null,
    ].filter(Boolean);

    // Primary determines processing order: Jira > File > Instructions
    const primarySource = jiraUrl ? 'Jira' : filePath ? 'File' : 'Instructions';
    const isSupplementary = activeSources.length > 1;

    return [
      `### Entry ${idx + 1}: ${e.moduleName} (${e.category || '@Modules'})`,
      `**Page URL:** ${e.pageURL}`,
      e.subModuleName && e.subModuleName.length > 0 ? `**Sub-modules:** ${e.subModuleName.join(', ')}` : '',
      `**File name:** ${e.fileName || 'auto'}`,
      `**Explore:** ${e.explore !== false ? 'Yes' : 'No'}`,
      `**Primary input:** ${primarySource}${jiraUrl ? ` — \`${jiraUrl}\`` : filePath ? ` — \`${filePath}\`` : ''}${isSupplementary ? ` (+${activeSources.length - 1} supplementary source${activeSources.length > 2 ? 's' : ''})` : ''}`,
      ``,
      `**Instructions:**`,
      instructionsList,
      ``,
      `**Phase 2 — Input sources detected:**`,
      jiraUrl         ? `- ✅ Jira: \`${jiraUrl}\`` : `- ✗ Jira: none`,
      filePath        ? `- ✅ File: \`${filePath}\`` : `- ✗ File: none`,
      hasInstructions ? `- ✅ Instructions: ${e.instructions.length} item(s)` : `- ✗ Instructions: none`,
      ``,
      activeSources.length === 0
        ? `⛔ No input sources — skip this entry.`
        : [
            `**Primary source: ${primarySource}**${isSupplementary ? ` | Supplementary: ${activeSources.filter(s => s !== primarySource).join(', ')}` : ''}`,
            ``,
            `**Phase 3 processing order:**`,
            jiraUrl         ? `1. Fetch Jira ticket \`${jiraUrl}\` via Atlassian MCP tools → convert to markdown` : null,
            filePath        ? `${jiraUrl ? '2' : '1'}. Read/convert file \`${filePath}\` via markitdown tools` : null,
            hasInstructions && (jiraUrl || filePath)
              ? `${[jiraUrl, filePath].filter(Boolean).length + 1}. Append instructions[] as "Additional scenario guidance" — do NOT discard`
              : hasInstructions
              ? `1. Format instructions[] directly as markdown test plan`
              : null,
            `→ Write merged content to \`e2e-tests/plans/\``,
          ].filter(Boolean).join('\n'),
      ``,
      `**Execute these steps in order:**`,
      (jiraUrl || filePath)
        ? [
            `1. **⚠️ MANDATORY Phase 3:** Call \`e2e_process\` FIRST to extract scenarios from ${jiraUrl ? 'the Jira ticket' : 'the file'}:`,
            `   \`\`\`json`,
            `   {`,
            `     "moduleName": "${e.moduleName}",`,
            `     "category": "${e.category || '@Modules'}",`,
            `     "fileName": "${e.fileName || 'auto'}",`,
            `     ${jiraUrl ? `"jiraUrl": "${jiraUrl}",` : ''}`,
            `     ${filePath ? `"filePath": "${filePath}",` : ''}`,
            `     "instructions": ${JSON.stringify(e.instructions || [])}`,
            `   }`,
            `   \`\`\``,
            `   Follow the returned routing steps: fetch Jira / convert file → extract scenarios for \`${e.moduleName}\` → write parsed plan. The returned scenario list is the Jira/file-derived subset for this module.`,
            ``,
            `2. Call \`e2e_explore\` with the **merged scenario list**. Combine:`,
            `   a) Scenarios extracted by \`e2e_process\` in step 1 (from the Jira ticket / file, filtered to \`${e.moduleName}\`)`,
            `   b) The original config \`instructions[]\`: ${JSON.stringify(e.instructions || [])}`,
            `   De-duplicate near-identical items; both sets inform exploration — never drop the user's config instructions just because Jira/file content is present.`,
            ``,
            `   \`\`\`json`,
            `   {`,
            `     "pageURL": "${e.pageURL}",`,
            `     "moduleName": "${e.moduleName}",`,
            `     "category": "${e.category || '@Modules'}",`,
            `     "fileName": "${e.fileName || 'auto'}",`,
            `     "instructions": [ /* merged list of Jira/file-extracted + config instructions[] */ ]`,
            `   }`,
            `   \`\`\``,
          ].join('\n')
        : [
            `1. **⚠️ MANDATORY Phase 3:** Call \`e2e_process\` FIRST to write the formatted plan file:`,
            `   \`\`\`json`,
            `   {`,
            `     "moduleName": "${e.moduleName}",`,
            `     "category": "${e.category || '@Modules'}",`,
            `     "fileName": "${e.fileName || 'auto'}",`,
            `     "instructions": ${JSON.stringify(e.instructions || [])}`,
            `   }`,
            `   \`\`\``,
            `   This writes the instructions as a structured plan to \`e2e-tests/plans/\` — required before exploration.`,
            ``,
            `2. Call \`e2e_explore\` with:`,
            `   - pageURL: \`${e.pageURL}\``,
            `   - moduleName: \`${e.moduleName}\``,
            `   - category: \`${e.category || '@Modules'}\``,
            `   - fileName: \`${e.fileName || 'auto'}\``,
            `   - instructions: ${JSON.stringify(e.instructions || [])}`,
          ].join('\n'),
      `3. Perform live browser exploration (planner_setup_page → browser_navigate → browser_snapshot → interactions)`,
      `4. Write the seed file, plan file, and update agent memory`,
      `5. Present the plan to the user for approval (Phase 6)`,
    ]
      .filter(Boolean)
      .join('\n');
  });

  const text = [
    `## E2E Automation Pipeline`,
    ``,
    `### ⚠️ FIRST — preload all pipeline tools before calling them`,
    `Claude Desktop loads MCP tools on demand. Before proceeding, call \`tool_search\` ONCE to register every specwright pipeline tool you will need:`,
    ``,
    '```',
    'tool_search({ query: "select:e2e_explore,e2e_plan,e2e_generate,e2e_execute,e2e_heal,e2e_configure,e2e_status" })',
    '```',
    ``,
    `Do this BEFORE calling \`e2e_explore\` or any other tool below — otherwise you will hit "tool not loaded" errors.`,
    ``,
    `---`,
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
    `### ⚠️ USER-VISIBLE OUTPUT — MANDATORY`,
    `Claude Desktop hides tool results. After EVERY tool call, write a visible chat message before calling the next tool.`,
    ``,
    `**Track progress visually using this todo list — output it after EACH phase:**`,
    ``,
    '```',
    `□ Phase 1: Pipeline loaded`,
    `□ Phase 2: Input source detected`,
    `□ Phase 3: Plan file written (e2e_process)`,
    `□ Phase 4: Browser exploration (e2e_explore)`,
    `□ Phase 5: Plan ready for approval`,
    `□ Phase 6: User approved`,
    `□ Phase 7: BDD files generated (e2e_generate)`,
    `□ Phase 8: Tests run & healed (e2e_heal, if enabled)`,
    '```',
    ``,
    `Replace \`□\` with \`🔄\` for the phase in progress, \`✅\` for completed.`,
    `Example after Phase 3 complete:`,
    '```',
    `✅ Phase 1: Pipeline loaded`,
    `✅ Phase 2: Input source detected`,
    `✅ Phase 3: Plan file written`,
    `🔄 Phase 4: Browser exploration (e2e_explore) — in progress`,
    `□ Phase 5–8: pending`,
    '```',
    ``,
    `- After this response → output phases 1+2 as ✅ with module count and input source, then show the todo list`,
    `- After e2e_process  → output: "✅ Phase 3 complete — plan written. Starting browser exploration..."`,
    `- After e2e_explore  → output: "✅ Exploration complete. Here is the test plan for your approval:" then show the plan summary`,
    `- After user approves → output: "✅ Plan approved. Generating BDD files (Phase 7)..."`,
    `- After e2e_generate → output: "✅ BDD files generated:" then list the .feature and steps.js paths`,
    ``,
    `### Pipeline Instructions`,
    `Process each entry sequentially. For each entry:`,
    `1. Call \`e2e_process\` (Phase 3) — write formatted plan to e2e-tests/plans/`,
    `2. Call \`e2e_explore\` — browser exploration, seed file, plan file, agent memory`,
    `3. Present plan summary to user and wait for explicit approval`,
    `4. On approval, call \`e2e_generate\` (Phase 7) — BDD .feature + steps.js`,
    `5. If runGeneratedCases=true, call \`e2e_heal\` (Phase 8)`,
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
