import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_heal',
  annotations: { title: 'E2E Heal' },
  description:
    'Return a self-contained Claude Desktop workflow to run BDD tests and heal failures. Uses standard MCP tools + Bash for test execution — no project-scoped test_* tools.',
  inputSchema: {
    type: 'object',
    properties: {
      moduleName: { type: 'string', description: 'Module tag e.g. @HomePage' },
      category: { type: 'string', description: '@Modules or @Workflows' },
      maxIterations: { type: 'number', description: 'Max healing iterations (default: 3)' },
    },
    required: ['moduleName'],
  },
};

export async function handler({ moduleName, category, maxIterations = 3 }) {
  const config = getConfig();
  if (!config.projectConfigured) return notConfigured();

  const { projectRoot, featuresDir } = config;
  const projects = inferProjects(category, moduleName, featuresDir);
  const grepTag = moduleName.replace('@', '').toLowerCase();
  const projectFlags = projects.map((p) => `--project ${p}`).join(' ');
  const memoryFile = path.join(projectRoot, '.claude/agent-memory/playwright-test-healer/MEMORY.md');
  const execMemoryFile = path.join(projectRoot, '.claude/agent-memory/execution-manager/MEMORY.md');

  const text = [
    `# Phase 8: Test & Heal — ${moduleName}`,
    ``,
    `## Playwright projects (inferred)`,
    `${projects.join(', ')}`,
    ``,
    `## Max iterations: ${maxIterations}`,
    ``,
    `---`,
    ``,
    `## Step 1: Read healer memory`,
    ``,
    `Read BOTH memory files — they contain complementary knowledge:`,
    `- \`mcp__specwright__read_file\` path: \`${memoryFile}\` — selector fixes, anti-patterns, project conventions`,
    `- \`mcp__specwright__read_file\` path: \`${execMemoryFile}\` — run outcomes, known flaky tests, project-wide test execution patterns`,
    ``,
    `Apply knowledge from both before starting investigation. Try known fixes first.`,
    ``,
    `## Step 2: Initial test run`,
    ``,
    `Use \`mcp__playwright-test__browser_evaluate\` (or shell via the playwright MCP) to run:`,
    '```bash',
    `cd ${projectRoot}`,
    `npx bddgen && npx playwright test ${projectFlags} --grep "@${grepTag}" --reporter json`,
    '```',
    ``,
    `Parse the JSON output for pass/fail counts and failure details. If all pass → done, skip to step 5.`,
    ``,
    `## Step 3: Investigate each failure`,
    ``,
    `For each failing test:`,
    `- Identify the broken selector from the error message`,
    `- \`mcp__specwright__read_file\` on the relevant \`steps.js\` file`,
    `- \`mcp__specwright__read_file\` source files in \`src/\` to find current selector attributes`,
    `- If live browser inspection helps, use the browser MCP tools:`,
    `  - \`mcp__playwright-test__browser_navigate\` to reach the page`,
    `  - \`mcp__playwright-test__browser_snapshot\` to see live refs/roles/names`,
    `  - \`mcp__playwright-test__browser_console_messages\` for JS errors`,
    `  - \`mcp__playwright-test__browser_network_requests\` for API failures`,
    ``,
    `## Step 4: Apply fix + re-run`,
    ``,
    `Use \`mcp__specwright__edit_file\` on the \`steps.js\` to:`,
    `- Update selectors to match current DOM`,
    `- Fix assertions / expected values`,
    `- Use regex for inherently dynamic values`,
    ``,
    `Then re-run the test command from Step 2. Repeat investigation → fix → re-run up to \`${maxIterations}\` iterations, or until all pass.`,
    ``,
    `If after ${maxIterations} iterations a test still fails and you're confident the test is correct, add \`test.fixme()\` with a comment explaining observed vs expected behaviour (do NOT ask the user — this is non-interactive).`,
    ``,
    `## Step 5: Update both memory files ⚠️ MANDATORY`,
    ``,
    `**5a. Healer memory** — \`mcp__specwright__edit_file\` or \`mcp__specwright__write_file\` on \`${memoryFile}\`:`,
    `- **Selector fixes**: date, module, old selector, new selector, reason — keep most recent 20`,
    `- **Project conventions** discovered (stable patterns)`,
    `- **Anti-patterns** that consistently fail`,
    ``,
    `**5b. Execution-manager memory** — update \`${execMemoryFile}\`:`,
    `- **Run outcomes**: date, module, projects used, pass/fail count, iterations needed`,
    `- **Known flaky tests**: test name, failure mode, workaround applied`,
    `- **Project-level patterns**: environment issues, auth behaviour, timing quirks`,
    ``,
    `Skipping either memory file means future runs repeat the same investigation.`,
    ``,
    `## Step 6: Report`,
    ``,
    `Summarise: iterations used, fixes applied, final pass/fail count. Reference the memory entries added.`,
    ``,
    `---`,
    ``,
    `## Rules`,
    ``,
    `- Never wait for \`networkidle\` or use deprecated APIs`,
    `- Fix one failure at a time; verify each fix with a re-run before moving on`,
    `- Do NOT ask the user clarifying questions — make the most reasonable choice`,
  ].join('\n');

  return { content: [{ type: 'text', text }] };
}

function inferProjects(category, moduleName, featuresDir) {
  // Use the dedicated precondition + workflow-consumers projects instead of
  // `run-workflow` (which forces all phases through one worker and causes
  // playwright-bdd's $bddContext to leak between @0-Precondition and
  // @1-Consumer — surfaces as `bddTestData not found`).
  if (category === '@Workflows') return ['setup', 'precondition', 'workflow-consumers'];
  if (moduleName && /auth/i.test(moduleName)) return ['auth-tests'];
  if (moduleName && featuresDir) {
    const moduleDir = path.join(featuresDir, category || '@Modules', moduleName);
    if (fs.existsSync(moduleDir)) {
      const files = fs.readdirSync(moduleDir).filter((f) => f.endsWith('.feature'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(moduleDir, file), 'utf-8');
        if (content.includes('@serial-execution')) return ['setup', 'serial-execution'];
      }
    }
  }
  return ['setup', 'main-e2e'];
}

function notConfigured() {
  return { content: [{ type: 'text', text: '⚠️ Project not configured. Call `e2e_configure` with `action: "set_project"` first.' }] };
}
