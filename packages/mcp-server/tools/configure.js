import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_configure',
  annotations: { title: 'E2E Configure' },
  description:
    'Read, list, add, or initialize E2E test configuration. Use action "init" to get setup info and base URL. Supports env vars E2E_BASE_URL and E2E_PROJECT_ROOT from MCP server config.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'list', 'add', 'init'],
        description:
          'init: get setup info + base URL + existing modules. read: show instructions.js. list: show test modules. add: append config entry.',
      },
      config: {
        type: 'object',
        description: 'Config entry to add (only for action=add). Must include moduleName, pageURL.',
        properties: {
          moduleName: { type: 'string' },
          category: { type: 'string' },
          subModuleName: { type: 'array', items: { type: 'string' } },
          fileName: { type: 'string' },
          instructions: { type: 'array', items: { type: 'string' } },
          pageURL: { type: 'string' },
        },
      },
    },
    required: ['action'],
  },
};

export async function handler({ action, config: configInput }) {
  const config = getConfig();

  if (action === 'init') {
    return handleInit(config);
  }

  if (action === 'read') {
    if (!fs.existsSync(config.instructionsPath)) {
      return { content: [{ type: 'text', text: 'No instructions.js found.' }] };
    }
    const content = fs.readFileSync(config.instructionsPath, 'utf-8');
    return { content: [{ type: 'text', text: `## Current instructions.js\n\n\`\`\`javascript\n${content}\n\`\`\`` }] };
  }

  if (action === 'list') {
    return handleList(config);
  }

  if (action === 'add') {
    return handleAdd(config, configInput);
  }

  return { content: [{ type: 'text', text: `Unknown action: ${action}` }] };
}

function handleInit(config) {
  const hasInstructions = fs.existsSync(config.instructionsPath);
  const { modules, workflows } = scanModules(config);

  let instructionsSummary = '(no instructions.js found)';
  if (hasInstructions) {
    const content = fs.readFileSync(config.instructionsPath, 'utf-8');
    const entryCount = (content.match(/moduleName/g) || []).length;
    instructionsSummary = `${entryCount} config ${entryCount === 1 ? 'entry' : 'entries'} configured`;
  }

  // Check seed file and plans
  const hasSeed = fs.existsSync(config.seedFilePath);
  const planFiles = fs.existsSync(config.plansDir)
    ? fs.readdirSync(config.plansDir).filter((f) => f.endsWith('-plan.md'))
    : [];

  const text = [
    `## E2E Automation Setup`,
    ``,
    `**Base URL:** ${config.baseURL}${process.env.BASE_URL ? ' (from env)' : ' (default)'}`,
    `**Project Root:** ${config.projectRoot}`,
    `**Auth Required:** ${config.authRequired ? 'Yes' : 'No (public site)'}`,
    config.authRequired
      ? config.authData
        ? `**Auth Data:** ${Object.keys(config.authData)
            .filter((k) => k !== 'instructions')
            .join(', ')} configured`
        : `**Auth Data:** Not set — set AUTH_DATA in MCP env (JSON with email, password, etc.)`
      : '',
    `**Instructions:** ${instructionsSummary}`,
    `**Seed File:** ${hasSeed ? 'exists' : 'not yet created'}`,
    `**Plans:** ${planFiles.length > 0 ? planFiles.join(', ') : 'none'}`,
    ``,
    `### Existing Modules (${modules.length})`,
    modules.length > 0 ? modules.join('\n') : '(none)',
    ``,
    `### Existing Workflows (${workflows.length})`,
    workflows.length > 0 ? workflows.join('\n') : '(none)',
    ``,
    `### To Create Tests`,
    ``,
    ...buildMissingInfoPrompt(config),
  ].join('\n');

  return { content: [{ type: 'text', text }] };
}

function handleList(config) {
  const { modules, workflows } = scanModules(config);

  const text = [
    `## Existing Test Modules`,
    ``,
    `### @Modules/ (${modules.length})`,
    modules.length > 0 ? modules.join('\n') : '(none)',
    ``,
    `### @Workflows/ (${workflows.length})`,
    workflows.length > 0 ? workflows.join('\n') : '(none)',
  ].join('\n');

  return { content: [{ type: 'text', text }] };
}

function handleAdd(config, configInput) {
  if (!configInput || !configInput.moduleName) {
    return {
      content: [
        {
          type: 'text',
          text: [
            'Error: config must include at least moduleName.',
            '',
            'If the user did not provide a page URL, ask them for it.',
            '',
            '### NEXT_ACTION: ASK_USER',
            'Ask for the page URL and test instructions.',
          ].join('\n'),
        },
      ],
    };
  }

  // Resolve pageURL — use provided URL or construct from base URL
  let pageURL = configInput.pageURL;
  if (!pageURL) {
    return {
      content: [
        {
          type: 'text',
          text: [
            `Error: pageURL is required for module ${configInput.moduleName}.`,
            ``,
            `**Base URL:** ${config.baseURL}`,
            `Provide the page path (e.g., /home) or full URL.`,
            ``,
            `### NEXT_ACTION: ASK_USER`,
          ].join('\n'),
        },
      ],
    };
  }

  // If pageURL is a path, prepend base URL
  if (pageURL.startsWith('/')) {
    pageURL = `${config.baseURL}${pageURL}`;
  }

  const entry = {
    filePath: '',
    moduleName: configInput.moduleName,
    category: configInput.category || '@Modules',
    subModuleName: configInput.subModuleName || [],
    fileName: configInput.fileName || configInput.moduleName.replace('@', '').toLowerCase(),
    instructions: configInput.instructions || [],
    pageURL,
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  };

  // Read existing, append entry
  let existing = 'export default [];';
  if (fs.existsSync(config.instructionsPath)) {
    existing = fs.readFileSync(config.instructionsPath, 'utf-8');
  }

  const entryStr = JSON.stringify(entry, null, 2);
  const updated = existing.replace(/\];\s*$/, `  ${entryStr},\n];\n`);
  fs.writeFileSync(config.instructionsPath, updated);

  const nextStep =
    configInput.instructions && configInput.instructions.length > 0
      ? `Next: call \`e2e_explore\` with pageURL="${pageURL}", moduleName="${configInput.moduleName}", and the instructions.`
      : `Next: call \`e2e_explore\` with pageURL="${pageURL}", moduleName="${configInput.moduleName}" to auto-explore the page.`;

  return {
    content: [
      {
        type: 'text',
        text: `Added config for **${configInput.moduleName}** to instructions.js.\n\n${nextStep}`,
      },
    ],
  };
}

function scanModules(config) {
  const modules = [];
  const workflows = [];

  const modulesDir = path.join(config.featuresDir, '@Modules');
  const workflowsDir = path.join(config.featuresDir, '@Workflows');

  if (fs.existsSync(modulesDir)) {
    for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('@')) {
        const features = fs.readdirSync(path.join(modulesDir, entry.name)).filter((f) => f.endsWith('.feature'));
        modules.push(`- **${entry.name}** (${features.length} feature${features.length !== 1 ? 's' : ''})`);
      }
    }
  }

  if (fs.existsSync(workflowsDir)) {
    for (const entry of fs.readdirSync(workflowsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('@')) {
        const subDirs = fs.readdirSync(path.join(workflowsDir, entry.name)).filter((d) => d.startsWith('@'));
        workflows.push(`- **${entry.name}** (${subDirs.length} sub-feature${subDirs.length !== 1 ? 's' : ''})`);
      }
    }
  }

  return { modules, workflows };
}

function buildMissingInfoPrompt(config) {
  const lines = [];
  const questions = [];
  let questionNum = 1;

  // Check what's missing and build targeted questions
  const hasBaseURL = !!process.env.BASE_URL;
  const hasCredentials = config.authData && config.authData.email && config.authData.password;

  if (!hasBaseURL) {
    questions.push(
      `${questionNum++}. **What is the application URL?** (e.g., http://localhost:5173) — BASE_URL is not configured`,
    );
  }

  if (config.authRequired && !hasCredentials) {
    questions.push(
      `${questionNum++}. **What are the login credentials?** (email and password) — needed for authenticated pages. Set AUTH_DATA in MCP env config, or set AUTH_REQUIRED=false if the site is public.`,
    );
  }

  questions.push(`${questionNum++}. **Which page do you want to test?** (e.g., /home, /users, /bookings)`);
  questions.push(
    `${questionNum++}. **What should be tested?** Describe test scenarios, or say "auto-explore" to discover automatically.`,
  );

  lines.push(`Ask the user the following:\n`);
  lines.push(questions.join('\n'));
  lines.push('');
  lines.push(`### NEXT_ACTION: ASK_USER`);
  lines.push(
    `Collect the missing information above before proceeding. You can derive the module name from the page path (e.g., /home → @HomePage, /users → @Users).`,
  );

  return lines;
}
