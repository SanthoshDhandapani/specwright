import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';
import { readAgentPrompt } from '../utils/agent.js';

export const definition = {
  name: 'e2e_process',
  annotations: { title: 'E2E Process' },
  description:
    '⚠️ Phase 3: Convert raw input (Jira URL, file path, or free-text instructions) into a structured parsed plan for the target module. Returns the @input-processor agent prompt + routing plan so Claude Desktop can fetch Jira via mcp__atlassian__*, convert files via mcp__markitdown__*, and extract module-scoped scenarios. MUST be called before e2e_explore when the config entry has inputs.jira.url or filePath — otherwise Jira/file scenarios will not flow into exploration.',
  inputSchema: {
    type: 'object',
    properties: {
      moduleName: { type: 'string', description: 'Module tag (e.g. @Users) — used to filter scenarios from multi-module Jira tickets' },
      category: { type: 'string', description: '@Modules or @Workflows' },
      fileName: { type: 'string', description: 'Output file stem (e.g. users). Auto-derived from moduleName if omitted.' },
      jiraUrl: { type: 'string', description: 'From inputs.jira.url in config entry' },
      filePath: { type: 'string', description: 'From filePath in config entry (PDF, Word, Excel, CSV, etc.)' },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'From instructions[] in config entry. Used standalone if no Jira/file, otherwise appended as supplementary guidance.',
      },
    },
    required: ['moduleName'],
  },
};

export async function handler({ moduleName, category, fileName, jiraUrl, filePath, instructions }) {
  const config = getConfig();
  if (!config.projectConfigured) return notConfigured();

  const { projectRoot } = config;
  const cat = category || '@Modules';
  const stem = fileName || moduleName.replace('@', '').toLowerCase();

  const { found, prompt: processorPrompt, path: processorPath } = readAgentPrompt(projectRoot, 'input-processor');
  if (!found) {
    return {
      content: [{
        type: 'text',
        text: `❌ @input-processor agent not found — run \`npx @specwright/plugin init\` in ${projectRoot}`,
      }],
    };
  }

  const parsedPath = path.join(projectRoot, 'e2e-tests/plans', `${moduleName.replace('@', '').toLowerCase()}-${stem}-parsed.md`);
  fs.mkdirSync(path.dirname(parsedPath), { recursive: true });

  const hasJira = jiraUrl && typeof jiraUrl === 'string' && jiraUrl.length > 0;
  const hasFile = filePath && typeof filePath === 'string' && filePath.length > 0;
  const hasText = Array.isArray(instructions) && instructions.length > 0;
  const primary = hasJira ? 'Jira' : hasFile ? 'File' : 'Text';

  const routingSteps = [];
  if (hasJira) {
    routingSteps.push(
      `**Jira mode** (primary)`,
      `1. Fetch the Jira ticket using \`mcp__atlassian__getJiraIssue\` with cloudId + issueKey (or extract from the URL ${jiraUrl})`,
      `2. Include linked/parent/child issues if relevant`,
      `3. Extract all scenario descriptions from the ticket body, comments, and Acceptance Criteria`,
      `4. **Filter to \`${moduleName}\` only** — multi-module tickets should yield ONLY scenarios relevant to this module`,
    );
  }
  if (hasFile) {
    routingSteps.push(
      `**File mode** ${hasJira ? '(supplementary)' : '(primary)'}`,
      `- Read \`${filePath}\``,
      `- If binary/structured (PDF, DOCX, XLSX, PPTX, CSV): call \`mcp__markitdown__convert_to_markdown\` to convert to markdown`,
      `- Extract scenarios relevant to \`${moduleName}\``,
    );
  }
  if (hasText) {
    routingSteps.push(
      `**Text mode** ${(hasJira || hasFile) ? '(supplementary)' : '(primary)'}`,
      `- Append the ${instructions.length} instruction(s) below as "Additional scenario guidance" to the parsed plan`,
      `- These come directly from the user's config \`instructions[]\` array`,
    );
  }

  const instructionsList = hasText ? instructions.map((s, i) => `  ${i + 1}. ${s}`).join('\n') : '  (no free-text instructions)';

  const text = [
    `# Phase 3: Process Input for ${moduleName}`,
    ``,
    `## 🔒 CREDENTIAL PRIVACY (non-negotiable)`,
    ``,
    `When reporting "Phase 3 complete" or any summary to the user, NEVER include:`,
    `- Passwords, API tokens, OAuth keys`,
    `- Email addresses, 2FA codes, session secrets`,
    `- Contents of \`.env.testing\`, \`.env\`, or any other env file`,
    ``,
    `OK to say: "Auth strategy: email-password (credentials loaded from env)". NOT OK to echo the actual values. Treat all credentials as write-only.`,
    ``,
    `## Inputs detected`,
    `- **Primary source:** ${primary}`,
    hasJira ? `- **Jira URL:** \`${jiraUrl}\`` : null,
    hasFile ? `- **File path:** \`${filePath}\`` : null,
    hasText ? `- **Free-text instructions:** ${instructions.length} item(s)` : null,
    ``,
    `## Required output`,
    `Write a parsed plan markdown file to \`${parsedPath}\` containing:`,
    `- Title + module tag`,
    `- The raw ticket/file content (cleaned)`,
    `- Numbered list of scenarios extracted for **${moduleName} only** (drop scenarios for other modules)`,
    `- Any free-text instructions appended as "Additional scenario guidance"`,
    ``,
    `The scenario list in this file will be **MERGED** with the original config \`instructions[]\` when passed to \`e2e_explore\` — both sources inform exploration. Do not treat the parsed plan as a replacement for the user's config instructions.`,
    ``,
    `---`,
    ``,
    `## Agent system prompt (@input-processor)`,
    `Source: \`${processorPath}\``,
    ``,
    processorPrompt,
    ``,
    `---`,
    ``,
    `## Routing steps (execute in order)`,
    ...routingSteps,
    ``,
    `## Free-text instructions to include`,
    '```',
    instructionsList,
    '```',
    ``,
    `---`,
    ``,
    `## After completion`,
    `1. Save the parsed plan to \`${parsedPath}\` via the \`Write\` tool`,
    `2. Extract the filtered scenario list (as an array of strings) from the parsed plan`,
    `3. **Merge with the original config instructions[]** — both inform exploration:`,
    `   \`\`\`javascript`,
    `   const extractedFromJiraOrFile = [ /* from parsed plan, filtered to ${moduleName} */ ];`,
    `   const fromConfig = ${JSON.stringify(instructions || [])};`,
    `   const merged = [...extractedFromJiraOrFile, ...fromConfig];  // de-dupe near-identical items`,
    `   \`\`\``,
    `4. Call \`e2e_explore\` with:`,
    `   - \`pageURL\`: (from original config)`,
    `   - \`moduleName\`: \`${moduleName}\``,
    `   - \`category\`: \`${cat}\``,
    `   - \`fileName\`: \`${stem}\``,
    `   - \`instructions\`: the MERGED array from step 3`,
    ``,
    `⛔ Do NOT skip this step when a Jira URL or file is present — downstream exploration will miss the real test scenarios.`,
    `⛔ Do NOT drop the config \`instructions[]\` when Jira/file is present — the user put them there for a reason; merge both sources.`,
  ].filter(Boolean).join('\n');

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
