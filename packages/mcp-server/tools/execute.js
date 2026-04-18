import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';
import { exec } from '../utils/exec.js';

export const definition = {
  name: 'e2e_execute',
  annotations: { title: 'E2E Execute' },
  description:
    'Run BDD feature tests or the seed exploration file. Infers the correct Playwright projects from category and module name. Returns pass/fail counts and failure details.',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['bdd', 'seed'],
        description: 'bdd — run generated feature files; seed — run seed.spec.js',
      },
      moduleName: {
        type: 'string',
        description: 'Module tag e.g. @HomePage — used for project inference in bdd mode',
      },
      category: {
        type: 'string',
        description: '@Modules or @Workflows — used for project inference',
      },
    },
    required: ['mode'],
  },
};

/**
 * Infer Playwright project flags from category + moduleName.
 * Mirrors the logic documented in execution-manager.md.
 */
async function inferProjects(category, moduleName, featuresDir) {
  // Use the dedicated precondition + workflow-consumers projects instead of the
  // single-worker `run-workflow` shortcut. `run-workflow` forces all phases
  // through one worker, which causes playwright-bdd's `$bddContext` worker
  // fixture to leak state between @0-Precondition and @1-Consumer spec files
  // (manifests as `bddTestData not found`). Separate projects = fresh workers.
  if (category === '@Workflows') return ['setup', 'precondition', 'workflow-consumers'];
  if (moduleName && /auth/i.test(moduleName)) return ['auth-tests'];

  // Check feature file for @serial-execution tag
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

export async function handler({ mode, moduleName, category }) {
  const config = getConfig();
  const { projectRoot, featuresDir, seedFilePath } = config;

  if (mode === 'seed') {
    if (!fs.existsSync(seedFilePath)) {
      return {
        content: [{ type: 'text', text: `❌ Seed file not found at ${seedFilePath}. Run e2e_plan first.` }],
      };
    }
    const result = exec(
      `npx playwright test "${seedFilePath}" --project chromium --timeout 60000 --retries 0`,
      { cwd: projectRoot, timeout: 180000 }
    );
    return formatResult('seed', result, null, null);
  }

  // BDD mode
  if (!moduleName) {
    return {
      content: [{
        type: 'text',
        text: [
          '### NEXT_ACTION: ASK_USER',
          'moduleName is required for bdd mode (e.g. @HomePage, @ListWorkflow).',
          'Ask the user which module to run.',
        ].join('\n'),
      }],
    };
  }

  const projects = await inferProjects(category, moduleName, featuresDir);
  const projectFlags = projects.map((p) => `--project ${p}`).join(' ');
  const grepTag = moduleName.replace('@', '').toLowerCase();

  const bddgenResult = exec('npx bddgen', { cwd: projectRoot });
  if (bddgenResult.exitCode !== 0) {
    return {
      content: [{ type: 'text', text: `❌ bddgen failed:\n\`\`\`\n${bddgenResult.stderr}\n\`\`\`` }],
    };
  }

  const testResult = exec(
    `npx playwright test ${projectFlags} --grep "@${grepTag}" --reporter json`,
    { cwd: projectRoot, timeout: 300000 }
  );

  return formatResult('bdd', testResult, projects, moduleName);
}

function formatResult(mode, result, projects, moduleName) {
  const lines = [
    `## e2e_execute — ${mode === 'seed' ? 'Seed Validation' : `BDD: ${moduleName}`}`,
    '',
    `**Projects:** ${projects ? projects.join(', ') : 'chromium'}`,
    `**Exit code:** ${result.exitCode}`,
    '',
  ];

  // Try to parse JSON reporter output for structured results
  let parsed = null;
  try {
    const jsonMatch = result.stdout.match(/\{[\s\S]*"stats"[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch { /* stdout may not contain JSON */ }

  if (parsed?.stats) {
    const { expected, unexpected, skipped } = parsed.stats;
    lines.push(`**Passed:** ${expected} | **Failed:** ${unexpected} | **Skipped:** ${skipped}`);
    if (unexpected > 0 && parsed.suites) {
      lines.push('', '### Failures');
      collectFailures(parsed.suites).forEach((f) => {
        lines.push(`- **${f.title}**`);
        if (f.error) lines.push(`  \`${f.error.slice(0, 200)}\``);
      });
    }
  } else {
    // Fallback: surface raw output
    const summary = result.stdout.split('\n').filter((l) =>
      /passed|failed|error|timeout/i.test(l)
    ).slice(0, 10);
    lines.push(summary.length ? summary.join('\n') : result.stdout.slice(0, 500));
    if (result.stderr) lines.push('', '**Stderr:**', result.stderr.slice(0, 300));
  }

  lines.push('', result.exitCode === 0 ? '✅ All tests passed.' : '❌ Failures detected — run e2e_heal to auto-fix.');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

function collectFailures(suites, results = []) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== 'expected') {
          const err = test.results?.[0]?.error?.message ?? '';
          results.push({ title: spec.title, error: err });
        }
      }
    }
    if (suite.suites) collectFailures(suite.suites, results);
  }
  return results;
}
