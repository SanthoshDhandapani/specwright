#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { writeGlobalConfig } from './utils/config.js';

// ── Auto-fix PATH on macOS when launched from a GUI app (e.g. Claude Desktop) ──
// GUI apps don't inherit the shell PATH, so tools like node, uvx, npx may not
// be found. Try sourcing the user's login shell to get the full PATH.
if (process.platform === 'darwin') {
  const commonPaths = ['/opt/homebrew/bin', '/usr/local/bin'];
  const needsFix = commonPaths.some((p) => !process.env.PATH?.includes(p));
  if (needsFix) {
    try {
      const shell = process.env.SHELL || '/bin/zsh';
      const shellPath = execSync(`${shell} -l -c "echo $PATH"`, {
        encoding: 'utf-8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (shellPath) {
        process.env.PATH = shellPath;
        process.stderr.write(`[specwright-mcp] PATH resolved via ${shell}\n`);
      }
    } catch {
      process.stderr.write('[specwright-mcp] Could not auto-detect PATH — set PATH in Claude Desktop MCP env config if tools are missing\n');
    }
  }
}

// Existing pipeline tools
import { definition as configureDef, handler as configureHandler } from './tools/configure.js';
import { definition as exploreDef, handler as exploreHandler } from './tools/explore.js';
import { definition as planDef, handler as planHandler } from './tools/plan.js';
import { definition as statusDef, handler as statusHandler } from './tools/status.js';
import { definition as automateDef, handler as automateHandler } from './tools/automate.js';

// New pipeline tools
import { definition as executeDef, handler as executeHandler } from './tools/execute.js';
import { definition as generateDef, handler as generateHandler } from './tools/generate.js';
import { definition as healDef, handler as healHandler } from './tools/heal.js';
import { definition as processDef, handler as processHandler } from './tools/process.js';

// ── Static tools (always available) ───────────────────────────────────────
const staticTools = [
  { definition: automateDef,  handler: automateHandler  },
  { definition: configureDef, handler: configureHandler },
  { definition: processDef,   handler: processHandler    },
  { definition: exploreDef,   handler: exploreHandler   },
  { definition: planDef,      handler: planHandler       },
  { definition: statusDef,    handler: statusHandler     },
  { definition: executeDef,   handler: executeHandler    },
  { definition: generateDef,  handler: generateHandler   },
  { definition: healDef,      handler: healHandler       },
];

// @specwright/mcp is a thin Claude Desktop bridge — it exposes e2e_* pipeline tools only.
// Browser automation (@playwright/mcp), file conversion (markitdown-mcp), and Atlassian MCP
// are configured as separate entries in the client project's .mcp.json (CLI/Desktop context)
// or in the user's claude_desktop_config.json (Claude Desktop context).
const tools = [...staticTools];

// ── MCP Server ───────────────────────────────────────────────────────────
// `instructions` is read by Claude Desktop (and other MCP clients that honor it)
// at connection time. It teaches the client the canonical tool invocation order
// so it does NOT improvise (e.g. asking the user for credentials before checking
// instructions.js).
const SERVER_INSTRUCTIONS = [
  'Specwright E2E Pipeline — canonical tool flow:',
  '',
  'ACTIVATION — invoke these tools whenever the user says any of the following (case-insensitive):',
  '  "Specwright", "E2E test", "E2E tests", "end-to-end test", "BDD test", "BDD tests",',
  '  "Playwright BDD", "playwright-bdd", "generate test", "generate tests",',
  '  "automate test", "run E2E", "write E2E", "create BDD", "e2e automate",',
  '  "test automation", "generate feature file", "generate scenarios"',
  'When any of these phrases appear in the user message, call `e2e_automate` immediately.',
  'Do NOT ask the user any questions first. Do NOT explain the pipeline. Just call the tool.',
  '',
  'STEP 0 (one-time, REQUIRED for clients with deferred tool loading like Claude Desktop):',
  '  Call tool_search with this exact query to preload every specwright tool:',
  '    select:e2e_automate,e2e_setup,e2e_configure,e2e_process,e2e_explore,e2e_plan,e2e_execute,e2e_generate,e2e_heal,e2e_status',
  '  Skipping this causes "tool not loaded" errors when later tools are called.',
  '',
  '1. ALWAYS call `e2e_automate({})` FIRST. Do NOT ask the user any setup questions before calling it.',
  '   - If it returns a pipeline plan → proceed to Phase 4 (exploration).',
  '   - If it returns "NEXT_ACTION: CALL_E2E_SETUP" → call `e2e_setup({})` next.',
  '2. `e2e_setup({})` collects new config via a native form or fallback questions.',
  '   - When the fallback fires with a "project path" question, the user answers, then call',
  '     `e2e_configure({ action: "set_project", projectPath: "<answer>" })` before anything else.',
  '3. `e2e_configure({ action: "add", config: {...} })` writes the collected config to instructions.js.',
  '4. Call `e2e_automate({})` again — now it will return the pipeline plan.',
  '5. For each entry: `e2e_explore` → user approval → `e2e_generate` → optional `e2e_heal`.',
  '',
  'Strict rules:',
  '- NEVER ask the user "what project", "what module", or "what credentials" before calling e2e_automate.',
  '- NEVER call `e2e_setup` before `e2e_automate` — always check existing state first.',
  '- NEVER improvise domain-specific or custom setup flows. The tools drive the flow.',
  '- After user approval in Phase 6, call `e2e_generate` IMMEDIATELY. Do NOT re-explore. Do NOT write `.spec.js` files manually. BDD output goes to `e2e-tests/features/playwright-bdd/{category}/{moduleName}/` as `.feature` + `steps.js`, NEVER to `e2e-tests/playwright/`.',
  '- If a tool returns an error, RETRY the same tool — do NOT switch to filesystem investigation or improvised workflows.',
  '- If a browser tool fails with a filesystem error (ENOENT / mkdir / EACCES), the MCP client is missing --output-dir. Report the exact error and STOP — NEVER conclude "the browser is unreachable", NEVER fall back to reading src/ as an exploration substitute.',
  '',
  'CREDENTIAL PRIVACY (applies to EVERY phase and every response):',
  '- Values in `.env.testing` (TEST_USER_PASSWORD, TEST_USER_EMAIL, TEST_2FA_CODE, OAUTH_STORAGE_KEY, API tokens) are WRITE-ONLY.',
  '- You MAY use them inside tool calls (browser_evaluate, browser_type, etc.).',
  '- You MUST NOT echo, list, quote, or summarise the values in your chat output to the user.',
  '- You MUST NOT write them into seed/plan/memory files or any committed output.',
  '- OK: "auth configured ✓", "email: (set)". NOT OK: "email: user@example.com", "password: xyz".',
].join('\n');

const server = new Server(
  { name: 'specwright', version: '0.5.0' },
  {
    capabilities: { tools: {}, elicitation: {} },
    instructions: SERVER_INSTRUCTIONS,
  }
);

// ── e2e_setup — native form via server.elicitInput() ─────────────────────
// Defined here (not in tools/) so it has access to the server instance.
tools.push({
  definition: {
    name: 'e2e_setup',
    annotations: { title: 'E2E Setup' },
    description:
      '⚠️ ONLY call this after e2e_automate returned "NEXT_ACTION: CALL_E2E_SETUP" — meaning instructions.js is empty or missing. Never call this as the first action; always call e2e_automate first. Shows a native UI form (or fallback questions) to collect pipeline configuration.',
    inputSchema: { type: 'object', properties: {} },
  },
  handler: async () => {
    try {
      // ── Step 0: ask for project path if not configured ───────────────
      const { getConfig } = await import('./utils/config.js');
      const cfg = getConfig();
      if (!cfg.projectConfigured) {
        const projResult = await server.elicitInput({
          message: cfg.projectRoot
            ? `No .specwright.json found at "${cfg.projectRoot}". Run "npx @specwright/plugin init" in your project first, then provide the path below.`
            : 'Which Specwright project do you want to run E2E tests for? (Must have .specwright.json — run "npx @specwright/plugin init" first if not set up)',
          requestedSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                title: 'Project path',
                description: 'Absolute path to your project root — must contain .specwright.json',
              },
            },
            required: ['projectPath'],
          },
        });
        if (projResult.action === 'cancel') {
          return { content: [{ type: 'text', text: 'Setup cancelled.' }] };
        }
        const { projectPath } = projResult.content;
        // Validate before saving
        const { promises: fspCheck } = await import('fs');
        try {
          await fspCheck.access(path.join(projectPath, '.specwright.json'));
        } catch {
          return {
            content: [{
              type: 'text',
              text: [
                `⚠️ No .specwright.json found at \`${projectPath}\`.`,
                '',
                'This project has not been set up for Specwright yet. Run:',
                '```',
                'cd ' + projectPath,
                'npx @specwright/plugin init',
                '```',
                'Then call `e2e_setup` again.',
              ].join('\n'),
            }],
          };
        }
        writeGlobalConfig({ projectRoot: projectPath });
        process.env.SPECWRIGHT_PROJECT = projectPath; // apply immediately for this session
      }

      // ── Step 1: collect pipeline config ─────────────────────────────
      const result = await server.elicitInput({
        message: 'Configure the E2E test pipeline',
        requestedSchema: {
          type: 'object',
          properties: {
            testInput: {
              type: 'string',
              title: 'What do you want to test?',
              description: 'Jira URL  /  free-text description  /  file path to a spec document',
            },
            moduleName: {
              type: 'string',
              title: 'Module name',
              description: 'Tag for grouping these tests — must start with @ (e.g. @LoginPage, @Checkout, @Dashboard)',
            },
            pageURL: {
              type: 'string',
              title: 'Page URL',
              description: 'URL Claude will navigate to (e.g. http://localhost:3000/login)',
            },
            category: {
              type: 'string',
              title: 'Test category',
              enum: ['@Modules', '@Workflows'],
              description: '@Modules — standalone feature tests (most common). @Workflows — multi-step flow with shared data between phases.',
              default: '@Modules',
            },
            subModules: {
              type: 'string',
              title: 'Sub-modules (optional)',
              description: 'Comma-separated sub-module names if this module has sub-sections. @Workflows use numbered prefixes (e.g. @0-Precondition,@1-VerifyResult). @Modules can use plain names (e.g. @CreateUser,@VerifyInList). Leave empty for a single-level module.',
            },
            explore: {
              type: 'boolean',
              title: 'Explore in browser?',
              description: 'Opens a live browser to discover real selectors via Playwright',
            },
            validateSelectors: {
              type: 'boolean',
              title: 'Validate explored selectors?',
              description: 'Runs seed.spec.js after exploration to confirm all selectors work (only applies if exploring)',
            },
            runTests: {
              type: 'boolean',
              title: 'Run tests after generation?',
              description: 'Executes generated BDD tests and auto-heals failures',
            },
          },
          required: ['testInput', 'moduleName', 'pageURL'],
        },
      });

      if (result.action === 'cancel') {
        return { content: [{ type: 'text', text: 'Setup cancelled.' }] };
      }

      const {
        testInput, moduleName, pageURL,
        category = '@Modules',
        subModules = '',
        explore = true,
        validateSelectors = false,
        runTests = false,
      } = result.content;

      const cleanModule = moduleName.startsWith('@') ? moduleName : `@${moduleName}`;
      const fileName = cleanModule.replace('@', '').toLowerCase().replace(/\s+/g, '-');
      const isJiraUrl = /https?:\/\/.*atlassian\.net\/browse\//.test(testInput);

      // Parse sub-module phases: "@0-Precondition,@1-VerifyResult" → ["@0-Precondition", "@1-VerifyResult"]
      const subModuleName = subModules
        ? subModules.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.startsWith('@') ? s : `@${s}`)
        : [];

      const config = {
        moduleName: cleanModule,
        category: category || '@Modules',
        fileName,
        subModuleName,
        pageURL,
        inputs: isJiraUrl ? { jira: { url: testInput } } : {},
        instructions: isJiraUrl ? [] : [testInput],
        explore,
        runExploredCases: explore ? validateSelectors : false,
        runGeneratedCases: runTests,
      };

      return {
        content: [{
          type: 'text',
          text: [
            '## Pipeline configuration collected ✅',
            '',
            '```json',
            JSON.stringify(config, null, 2),
            '```',
            '',
            'Proceed with this config through the 10-phase pipeline.',
          ].join('\n'),
        }],
      };
    } catch (err) {
      // elicitInput not supported by this client — fall back gracefully
      const { getConfig } = await import('./utils/config.js').catch(() => ({ getConfig: () => ({}) }));
      const cfg = getConfig?.() ?? {};
      const projectConfigured = cfg.projectConfigured;
      const projectQuestion = projectConfigured
        ? []
        : [
            '0. **Project path** — absolute path to your project root (must contain `.specwright.json`). Run `npx @specwright/plugin init` in the project first if not set up yet.',
            '',
          ];
      const projectNote = projectConfigured
        ? []
        : [
            '⚠️ **Special handling for question 0 (project path):** ask ONLY that question first. Once answered, immediately call `e2e_configure` with `{ "action": "set_project", "projectPath": "<answer>" }` — the tool response will include the remaining 8 questions which you will then present as one message.',
            '',
          ];

      const totalQuestions = projectConfigured ? 8 : 1;
      const phrasing = projectConfigured
        ? `please answer all ${totalQuestions} questions in one reply`
        : 'please answer question 0 first';

      return {
        content: [{
          type: 'text',
          text: [
            '⚠️ Native form not supported — use the chat-based questionnaire below.',
            '',
            '## ⛔ PRESENT THIS ENTIRE QUESTIONNAIRE TO THE USER IN A SINGLE MESSAGE',
            '',
            '**CRITICAL INSTRUCTIONS — read carefully before responding to the user:**',
            '- Copy the **entire numbered list below** into your next message to the user, verbatim',
            '- Do NOT ask questions one at a time',
            '- Do NOT say "Question 1" and wait for the answer before showing Question 2',
            '- Do NOT reword, summarise, or split the questions',
            '- The user will read ALL questions and reply with ALL answers in one message',
            '',
            ...projectNote,
            '---',
            '',
            `📋 **Configure your test module** — ${phrasing}:`,
            '',
            ...projectQuestion,
            '1. **What do you want to test?** — paste a Jira ticket URL, describe the feature in plain text, or give a file path to a spec document',
            '2. **Module name** — a short tag starting with @ to group these tests (e.g. @LoginPage, @SearchPage, @CheckoutFlow)',
            '3. **Page URL** — the full URL Claude will navigate to, including port (e.g. http://localhost:5173/your-page)',
            '4. **Test category** — type @Modules for standalone feature tests, or @Workflows for multi-step flows with shared data between phases',
            '5. **Sub-modules** — optional, for modules with sub-sections. @Workflows use numbered prefixes (e.g. @0-Precondition,@1-VerifyInList). @Modules can use plain names (e.g. @CreateUser,@VerifyInList). Leave blank for a single-level module.',
            '6. **Explore in browser?** — yes to open a live browser and discover real selectors via Playwright, no to generate from description only',
            '7. **Validate explored selectors?** — (only if explore=yes) yes to run seed.spec.js and confirm selectors work before generation, no to skip validation',
            '8. **Run tests after generation?** — yes to execute generated BDD tests and auto-heal failures, no to only generate files',
          ].join('\n'),
        }],
      };
    }
  },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => t.definition),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find((t) => t.definition.name === name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    return await tool.handler(args || {});
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error in ${name}: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
