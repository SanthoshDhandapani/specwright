#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { promises as fsp } from 'fs';
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

// Proxy factory
import { createStdioProxy, createHttpProxy } from './utils/proxy.js';

// ── Static tools (always available) ───────────────────────────────────────
const staticTools = [
  { definition: automateDef,  handler: automateHandler  },
  { definition: configureDef, handler: configureHandler },
  { definition: exploreDef,   handler: exploreHandler   },
  { definition: planDef,      handler: planHandler       },
  { definition: statusDef,    handler: statusHandler     },
  { definition: executeDef,   handler: executeHandler    },
  { definition: generateDef,  handler: generateHandler   },
  { definition: healDef,      handler: healHandler       },
];

// ── Start proxied child servers ───────────────────────────────────────────
const proxies = [];

// 1. Playwright MCP — browser automation (stdio)
try {
  const require = createRequire(import.meta.url);
  // Resolve package dir via package.json, then find cli.js next to it
  const playwrightDir = path.dirname(require.resolve('@playwright/mcp/package.json'));
  const playwrightBin = path.join(playwrightDir, 'cli.js');
  const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? '.playwright-mcp';
  const pw = await createStdioProxy({
    command: 'node',
    // --isolated: keeps the browser profile in memory (no disk lock file).
    // Prevents "Chrome profile already in use" errors when a previous session
    // didn't close cleanly or when two MCP instances start simultaneously.
    args: [playwrightBin, '--isolated', '--output-dir', outputDir],
    label: 'browser',
  });
  if (pw) proxies.push(pw);
} catch {
  process.stderr.write('[specwright-mcp] @playwright/mcp not found — browser tools unavailable\n');
}

// 2. Markitdown MCP — file conversion (uvx stdio)
const md = await createStdioProxy({
  command: 'uvx',
  args: ['markitdown-mcp'],
  label: 'markitdown',
});
if (md) proxies.push(md);

// 3. Atlassian MCP — Jira (streamable-http, requires bearer token)
// The Atlassian hosted MCP requires auth even to list tools. If a token is available
// (from env or stored ~/.specwright/atlassian-auth.json), connect and proxy all Jira tools.
// Otherwise expose a jira_connect helper tool so Claude can prompt the user.
let storedAtlassianToken = '';
try {
  const stored = JSON.parse(await fsp.readFile(path.join(os.homedir(), '.specwright/atlassian-auth.json'), 'utf-8'));
  storedAtlassianToken = stored?.token ?? '';
} catch { /* file doesn't exist yet */ }

let atlassianConnected = false;
const atlassianToken = process.env.ATLASSIAN_TOKEN || storedAtlassianToken;
if (atlassianToken) {
  const at = await createHttpProxy({
    url: 'https://mcp.atlassian.com/v1/mcp',
    headers: { Authorization: `Bearer ${atlassianToken}` },
    label: 'atlassian',
  });
  if (at) { proxies.push(at); atlassianConnected = true; }
}

// jira_connect is defined later (after server is created) so it can use server.elicitInput()
let atlassianConnectedFinal = atlassianConnected; // captured for the inline handler below

// ── Merge proxy tools into tool registry ─────────────────────────────────
const tools = [...staticTools];
for (const proxy of proxies) {
  for (const tool of proxy.tools) {
    tools.push({
      definition: tool,
      handler: (args) => proxy.call(tool.name, args),
    });
  }
}

// ── MCP Server ───────────────────────────────────────────────────────────
const server = new Server(
  { name: 'specwright', version: '0.2.0' },
  { capabilities: { tools: {}, elicitation: {} } }
);

// ── jira_connect — URL + form elicitation for Atlassian API token ────────
if (!atlassianConnectedFinal) {
  tools.push({
    definition: {
      name: 'jira_connect',
      description:
        'Connect to Jira/Atlassian. Opens the Atlassian API token page in the browser, then asks for the token via a native form. Call this whenever a Jira ticket URL is provided or Jira data is needed.',
      inputSchema: { type: 'object', properties: {} },
    },
    handler: async () => {
      try {
        // Step 1: open Atlassian API tokens page in browser
        await server.elicitInput({
          mode: 'url',
          message:
            'To connect Jira, create an API token on the page that just opened in your browser, then come back here.',
          url: 'https://id.atlassian.com/manage-profile/security/api-tokens',
        });

        // Step 2: ask for the token via form
        const tokenResult = await server.elicitInput({
          message: 'Paste your Atlassian API token below.',
          requestedSchema: {
            type: 'object',
            properties: {
              token: {
                type: 'string',
                title: 'Atlassian API token',
                description: 'Generated at id.atlassian.com → Security → API tokens',
              },
            },
            required: ['token'],
          },
        });

        if (tokenResult.action === 'cancel') {
          return { content: [{ type: 'text', text: 'Jira connection cancelled.' }] };
        }

        const token = tokenResult.content?.token;
        if (!token) {
          return { content: [{ type: 'text', text: '⚠️ No token provided. Try again.' }] };
        }

        // Step 3: store token to disk
        const authDir = path.join(os.homedir(), '.specwright');
        await fsp.mkdir(authDir, { recursive: true });
        await fsp.writeFile(
          path.join(authDir, 'atlassian-auth.json'),
          JSON.stringify({ token, createdAt: new Date().toISOString() }, null, 2),
        );

        return {
          content: [{
            type: 'text',
            text: [
              '## Jira token saved ✅',
              '',
              'The Atlassian API token has been stored at `~/.specwright/atlassian-auth.json`.',
              '',
              '**To activate:** restart Claude Desktop — the Specwright MCP server will pick up the token automatically on next start.',
              '',
              'Alternatively, add `ATLASSIAN_TOKEN` to your Claude Desktop MCP config env block for a permanent setup.',
            ].join('\n'),
          }],
        };
      } catch (err) {
        // URL elicitation not supported — fall back to text instructions
        return {
          content: [{
            type: 'text',
            text: [
              '## Connect Jira',
              '',
              '1. Open: https://id.atlassian.com/manage-profile/security/api-tokens',
              '2. Create a new API token',
              '3. Add it to your Claude Desktop MCP config:',
              '   `"ATLASSIAN_TOKEN": "<your-token>"`',
              '4. Restart Claude Desktop',
            ].join('\n'),
          }],
        };
      }
    },
  });
}

// ── e2e_setup — native form via server.elicitInput() ─────────────────────
// Defined here (not in tools/) so it has access to the server instance.
tools.push({
  definition: {
    name: 'e2e_setup',
    description:
      'Show a native UI form to collect all pipeline configuration from the user. ' +
      'Call this whenever instructions.js is empty or missing, or when the user asks to set up a new module.',
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
      return {
        content: [{
          type: 'text',
          text: [
            '⚠️ Native form not supported. Ask the user these questions in order. Use the exact placeholder examples shown — do NOT replace them with project-specific names or URLs:',
            '',
            '1. **What do you want to test?** — paste a Jira ticket URL, describe the feature in plain text, or give a file path to a spec document',
            '2. **Module name** — a short tag starting with @ to group these tests (e.g. @LoginPage, @SearchPage, @CheckoutFlow)',
            '3. **Page URL** — the full URL Claude will navigate to, including port (e.g. http://localhost:5173/your-page)',
            '4. **Test category** — type @Modules for standalone feature tests, or @Workflows for multi-step flows with shared data between phases',
            '5. **Sub-modules** — optional, for modules with sub-sections. @Workflows use numbered prefixes (e.g. @0-Precondition,@1-VerifyInList). @Modules can use plain names (e.g. @CreateUser,@VerifyInList). Leave blank for a single-level module.',
            '6. **Explore in browser?** — yes to open a live browser and discover real selectors via Playwright, no to generate from description only',
            '7. **Validate explored selectors?** — (only if explore=yes) yes to run seed tests and confirm selectors work before generation',
            '8. **Run tests after generation?** — yes to execute generated BDD tests and auto-heal failures',
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
