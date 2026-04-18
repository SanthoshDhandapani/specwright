import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_generate',
  annotations: { title: 'E2E Generate' },
    description:
    '⚠️ Phase 7 — CALL THIS IMMEDIATELY after the user approves the test plan (from Phase 6). Returns the exact paths and workflow to generate BDD `.feature` + `steps.js` files in `e2e-tests/features/playwright-bdd/`. NEVER write test files manually or to `e2e-tests/playwright/` — this tool has the correct paths and conventions. NEVER re-explore after approval — the seed file is the source of truth for selectors.',
  inputSchema: {
    type: 'object',
    properties: {
      planFilePath: { type: 'string', description: 'Absolute or project-relative path to the approved plan .md' },
      moduleName: { type: 'string', description: 'e.g. @HomePage' },
      category: { type: 'string', description: '@Modules or @Workflows' },
      fileName: { type: 'string', description: 'Output filename base e.g. homepage' },
    },
    required: ['planFilePath', 'moduleName', 'category', 'fileName'],
  },
};

export async function handler({ planFilePath, moduleName, category, fileName }) {
  const config = getConfig();
  if (!config.projectConfigured) return notConfigured();

  const { projectRoot, featuresDir, seedFilePath } = config;
  const resolvedPlan = path.isAbsolute(planFilePath) ? planFilePath : path.join(projectRoot, planFilePath);
  if (!fs.existsSync(resolvedPlan)) {
    return { content: [{ type: 'text', text: `❌ Plan not found: ${resolvedPlan}` }] };
  }

  const outputDir = path.join(featuresDir, category, moduleName);
  const featurePath = path.join(outputDir, `${fileName}.feature`);
  const stepsPath = path.join(outputDir, 'steps.js');
  fs.mkdirSync(outputDir, { recursive: true });

  const stepHelpersPath = path.join(projectRoot, 'e2e-tests/utils/stepHelpers.js');
  const knowledgePath = path.join(projectRoot, 'e2e-tests/.knowledge/generate-context.md');

  const text = [
    `# Phase 7: BDD Generation — ${moduleName}`,
    ``,
    `## ⛔ EXACT output paths (do NOT improvise)`,
    ``,
    `1. **Feature file** → \`${featurePath}\``,
    `2. **Steps file**   → \`${stepsPath}\``,
    ``,
    `Both files go into \`e2e-tests/features/playwright-bdd/${category}/${moduleName}/\`.`,
    ``,
    `❌ **Do NOT** write to \`e2e-tests/playwright/\` — that directory is for the seed exploration file only.`,
    `❌ **Do NOT** use \`.spec.js\` extension for BDD output — use \`.feature\` and \`steps.js\` exactly as shown above.`,
    `❌ **Do NOT** re-run browser exploration — the seed file already has validated selectors.`,
    `✅ Use the \`Write\` tool for both files, to the EXACT paths above.`,
    ``,
    `---`,
    ``,
    `## Context files to Read first`,
    ``,
    `- **Plan** (approved by user): \`${resolvedPlan}\``,
    `- **Seed** (validated selectors): \`${fs.existsSync(seedFilePath) ? seedFilePath : '(none — explore:false mode)'}\``,
    `- **stepHelpers**: \`${fs.existsSync(stepHelpersPath) ? stepHelpersPath : '(missing — run plugin init)'}\` — source of FIELD_TYPES, processDataTable, validateExpectations`,
    `- **Framework knowledge** (optional): \`${fs.existsSync(knowledgePath) ? knowledgePath : '(not present)'}\``,
    ``,
    `---`,
    ``,
    `## Step 1: Generate the \`.feature\` file`,
    ``,
    `Follow Gherkin + Playwright-BDD conventions:`,
    ``,
    `- Feature title matches the module`,
    `- Tags: \`@${moduleName.replace('@', '').toLowerCase()}\` module tag ${category === '@Workflows' ? '+ workflow tags (@precondition / @workflow-consumer / @serial-execution as needed)' : ''}`,
    `- Each scenario from the plan → one \`Scenario:\` or \`Scenario Outline:\``,
    `- Use 3-column data tables for form fills: \`| Field Name | Value | Type |\``,
    `  - \`<gen_test_data>\` + \`SharedGenerated\` → faker-generated, cached across scenarios`,
    `  - \`<from_test_data>\` + \`SharedGenerated\` → reads cached value from earlier scenario`,
    `  - Static known values → type \`Static\``,
    `- Reuse shared steps from \`e2e-tests/features/playwright-bdd/shared/\` — DO NOT redefine \`I am logged in\`, \`I navigate to\`, \`I should see the heading\`, \`I load predata from\`, etc.`,
    `- Assertion steps: describe expected state, not tool calls`,
    ``,
    `Write the file to \`${featurePath}\` via the \`Write\` tool.`,
    ``,
    `## Step 2: Generate \`steps.js\``,
    ``,
    `- Import from fixtures, NOT playwright-bdd directly:`,
    `  \`import { Given, When, Then, expect } from '<path>/playwright/fixtures.js';\``,
    `- Use \`processDataTable(page, dataTable, { mapping, fieldConfig })\` for form fill steps`,
    `- Use \`validateExpectations(page, dataTable, { mapping, validationConfig, container })\` for assertion steps`,
    `- \`FIELD_TYPES\` (from \`stepHelpers.js\`): FILL, DROPDOWN, CHECKBOX_TOGGLE, CLICK, CUSTOM; validation: TEXT_VISIBLE, INPUT_VALUE`,
    `- Use selectors from the seed file — never invent new ones`,
    `- Cross-feature workflows: \`saveScopedTestData('<scope>', { ... })\` in precondition; consumers load via the shared step \`Given I load predata from "<scope>"\`.`,
    ``,
    `Write the file to \`${stepsPath}\` via the \`Write\` tool.`,
    ``,
    `---`,
    ``,
    `## Best practices`,
    ``,
    `- Semantic locators (\`getByRole\`, \`getByLabel\`, \`getByTestId\`) > CSS`,
    `- Auto-retrying assertions (\`expect(locator).toBeVisible()\`) — no manual \`waitForTimeout\``,
    `- \`.first()\` / \`.nth()\` for multiple matches`,
    `- Each scenario stands alone (fresh state assumption)`,
    ``,
    `## After completion`,
    ``,
    `Report the scenario count and BDD file paths:`,
    `- \`${featurePath}\``,
    `- \`${stepsPath}\``,
    ``,
    `Next steps:`,
    `1. If \`runGeneratedCases: true\` → call \`e2e_heal\` (Phase 8)`,
    `2. Then Phase 9 (Cleanup) — remove intermediate plan files and reset the seed file:`,
    `   \`\`\`bash`,
    `   find ${projectRoot}/e2e-tests/plans/ -type f ! -name '.gitkeep' -delete`,
    `   : > ${projectRoot}/e2e-tests/playwright/generated/seed.spec.js`,
    `   \`\`\``,
    `   The BDD \`.feature\` + \`steps.js\` files are the committed source of truth — the plan and seed files are scratch artefacts that should be cleaned.`,
    `3. Phase 10 (Final Review) — summarise what was generated.`,
  ].join('\n');

  return { content: [{ type: 'text', text }] };
}

function notConfigured() {
  return { content: [{ type: 'text', text: '⚠️ Project not configured. Call `e2e_configure` with `action: "set_project"` first.' }] };
}
