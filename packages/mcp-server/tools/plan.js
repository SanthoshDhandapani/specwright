import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_plan',
  description:
    'Generate a seed file (validated selectors) and test plan markdown from exploration results. Call this after exploring a page with Playwright MCP tools.',
  inputSchema: {
    type: 'object',
    properties: {
      moduleName: {
        type: 'string',
        description: 'Module name with @ prefix (e.g., @HomePage, @Users).',
      },
      pageURL: {
        type: 'string',
        description: 'Full URL of the explored page.',
      },
      category: {
        type: 'string',
        enum: ['@Modules', '@Workflows'],
        description: 'Test category. Default: @Modules.',
      },
      fileName: {
        type: 'string',
        description: 'Output file stem (e.g., homepage). Auto-derived from moduleName if omitted.',
      },
      selectors: {
        type: 'array',
        description: 'Discovered selectors from browser exploration.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Selector key name (e.g., pageTitle, submitBtn).' },
            selector: { type: 'string', description: 'Playwright selector (e.g., getByRole("heading")).' },
            altSelector: { type: 'string', description: 'Alternative selector.' },
            type: {
              type: 'string',
              enum: ['testid', 'role', 'text', 'label', 'placeholder', 'css'],
              description: 'How the selector was discovered.',
            },
            tag: { type: 'string', description: 'HTML tag (e.g., BUTTON, INPUT).' },
            text: { type: 'string', description: 'Visible text content.' },
            description: { type: 'string', description: 'What this element does.' },
            validated: { type: 'boolean', description: 'Whether confirmed from live browser.' },
          },
          required: ['name', 'selector'],
        },
      },
      behaviors: {
        type: 'object',
        description: 'Free-form observations about page behavior (forms, tables, modals, etc.).',
      },
      scenarios: {
        type: 'array',
        description: 'Test scenarios discovered during exploration.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Scenario title.' },
            steps: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ordered test steps.',
            },
            type: {
              type: 'string',
              enum: ['happy-path', 'negative', 'edge-case', 'validation'],
              description: 'Scenario category.',
            },
          },
          required: ['name', 'steps'],
        },
      },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Original instructions from config (for reference in plan).',
      },
    },
    required: ['moduleName', 'pageURL', 'selectors'],
  },
};

export async function handler({
  moduleName,
  pageURL,
  category,
  fileName,
  selectors,
  behaviors,
  scenarios,
  instructions,
}) {
  const config = getConfig();
  const cat = category || '@Modules';
  const file = fileName || moduleName.replace('@', '').toLowerCase();
  const camelName = moduleName.replace('@', '').replace(/[^a-zA-Z0-9]/g, '');
  const camelKey = camelName.charAt(0).toLowerCase() + camelName.slice(1);
  const now = new Date().toISOString();

  // --- Generate seed.spec.js ---
  const selectorEntries = (selectors || [])
    .map((s) => {
      const fields = [`    selector: '${s.selector}'`];
      if (s.altSelector) fields.push(`    altSelector: '${s.altSelector}'`);
      if (s.type) fields.push(`    type: '${s.type}'`);
      if (s.tag) fields.push(`    tag: '${s.tag}'`);
      if (s.text) fields.push(`    text: ${JSON.stringify(s.text)}`);
      if (s.description) fields.push(`    description: ${JSON.stringify(s.description)}`);
      fields.push(`    validated: ${s.validated !== false}`);
      return `  ${s.name}: {\n${fields.join(',\n')}\n  }`;
    })
    .join(',\n');

  const behaviorsStr = behaviors ? JSON.stringify(behaviors, null, 2).replace(/^/gm, '  ').trimStart() : '{}';

  const seedContent = [
    `/**`,
    ` * Seed file: ${moduleName} — Validated Selectors`,
    ` * Generated: ${now}`,
    ` * Source: Browser exploration of ${pageURL}`,
    ` * Status: EXPLORED (selectors from live browser)`,
    ` */`,
    ``,
    `export const ${camelKey}Selectors = {`,
    selectorEntries,
    `};`,
    ``,
    `export const ${camelKey}Behaviors = ${behaviorsStr};`,
    ``,
  ].join('\n');

  // Ensure directory exists
  const seedDir = path.dirname(config.seedFilePath);
  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir, { recursive: true });
  }
  fs.writeFileSync(config.seedFilePath, seedContent);

  // --- Generate plan markdown ---
  const selectorTable = (selectors || [])
    .map((s) => `| ${s.name} | \`${s.selector}\` | ${s.type || '-'} | ${s.validated !== false ? 'Yes' : 'No'} |`)
    .join('\n');

  const scenariosMd = (scenarios || [])
    .map((s, i) => {
      const steps = s.steps.map((step, j) => `${j + 1}. ${step}`).join('\n');
      return `### TC${i + 1}: ${s.name} (${s.type || 'happy-path'})\n${steps}`;
    })
    .join('\n\n');

  const instructionsMd = (instructions || []).map((inst) => `- ${inst}`).join('\n');
  const moduleTag = moduleName.replace('@', '').toLowerCase();

  const planContent = [
    `# Test Plan: ${moduleName}`,
    ``,
    `## Module Info`,
    `- **Module:** ${moduleName}`,
    `- **Page URL:** ${pageURL}`,
    `- **Category:** ${cat}`,
    `- **File Name:** ${file}`,
    `- **Generated:** ${now}`,
    ``,
    `## Discovered Selectors`,
    `| Element | Selector | Type | Validated |`,
    `|---------|----------|------|-----------|`,
    selectorTable,
    ``,
    `## Test Scenarios`,
    scenariosMd || '(none — auto-explore mode)',
    ``,
    instructions && instructions.length > 0 ? `## Original Instructions\n${instructionsMd}\n` : '',
    `## Recommended Tags`,
    `\`@${moduleTag}\``,
    ``,
    `## Data Dependencies`,
    `(To be determined during BDD generation)`,
    ``,
    `## Generation Rules`,
    `When generating .feature + steps.js from this plan:`,
    `- Use 3-column data tables: \`| Field Name | Value | Type |\``,
    `- Form fill steps: use \`<gen_test_data>\` with type \`SharedGenerated\` — generates faker values`,
    `- Assertion steps: use \`<from_test_data>\` with type \`SharedGenerated\` — reads cached values`,
    `- Steps.js must use \`processDataTable()\` and \`validateExpectations()\` from \`utils/stepHelpers.js\``,
    `- Import from fixtures.js, never from playwright-bdd directly`,
    `- Reuse shared steps (auth, navigation, tabs) — do NOT redefine them`,
    cat === '@Workflows'
      ? [
          `- Precondition directory: \`@0-{Name}/\` with tags \`@precondition @cross-feature-data @serial-execution\``,
          `- Consumer directories: \`@1-{Name}/\`, \`@2-{Name}/\` with tag \`@workflow-consumer\` (NO @serial-execution)`,
          `- Precondition saves data: \`saveScopedTestData('${moduleTag}', { ... })\``,
          `- Consumers load data: \`Given I load predata from "${moduleTag}"\` (shared step, DO NOT redefine)`,
        ].join('\n')
      : '',
    ``,
    `## Next Steps`,
    `1. Review this plan and approve`,
    `2. Generate .feature + steps.js following the rules above`,
    `3. Run tests to validate`,
  ].join('\n');

  const planFileName = `${moduleName.replace('@', '').toLowerCase()}-${file}-plan.md`;
  const planPath = path.join(config.plansDir, planFileName);
  if (!fs.existsSync(config.plansDir)) {
    fs.mkdirSync(config.plansDir, { recursive: true });
  }
  fs.writeFileSync(planPath, planContent);

  return {
    content: [
      {
        type: 'text',
        text: [
          `## Plan Generated: ${moduleName}`,
          ``,
          `**Seed file:** ${config.seedFilePath}`,
          `- ${(selectors || []).length} selectors captured`,
          ``,
          `**Test plan:** ${planPath}`,
          `- ${(scenarios || []).length} scenarios defined`,
          ``,
          `**Open in Finder:**`,
          `\`open "${config.seedFilePath}"\``,
          `\`open "${planPath}"\``,
          ``,
          `### NEXT_ACTION: USER_APPROVAL`,
          `Present the test plan to the user for review before proceeding to BDD generation.`,
        ].join('\n'),
      },
    ],
  };
}
