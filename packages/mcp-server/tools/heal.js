import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';
import { exec } from '../utils/exec.js';

export const definition = {
  name: 'e2e_heal',
  annotations: { title: 'E2E Heal' },
  description:
    'Auto-heal failing BDD tests — runs tests, investigates source code for selector mismatches, applies fixes, and re-runs up to 3 iterations. Generates a review plan for unfixable failures.',
  inputSchema: {
    type: 'object',
    properties: {
      moduleName: {
        type: 'string',
        description: 'Module tag to heal e.g. @HomePage — infers Playwright projects automatically',
      },
      category: {
        type: 'string',
        description: '@Modules or @Workflows',
      },
      maxIterations: {
        type: 'number',
        description: 'Maximum healing iterations (default: 3)',
      },
    },
    required: ['moduleName'],
  },
};

export async function handler({ moduleName, category, maxIterations = 3 }) {
  const config = getConfig();
  const { projectRoot, featuresDir } = config;

  if (!moduleName) {
    return {
      content: [{
        type: 'text',
        text: [
          '### NEXT_ACTION: ASK_USER',
          'moduleName is required (e.g. @HomePage, @ListWorkflow).',
          'Ask the user which module to heal.',
        ].join('\n'),
      }],
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Infer projects (same logic as execute.js)
  const projects = inferProjects(category, moduleName, featuresDir);
  const projectFlags = projects.map((p) => `--project ${p}`).join(' ');
  const grepTag = moduleName.replace('@', '').toLowerCase();

  const agentsDir = path.join(projectRoot, '.claude/agents');
  const healerPrompt = readAgentPrompt(agentsDir, 'playwright/playwright-test-healer.md');

  // Run bddgen + initial test pass
  exec('npx bddgen', { cwd: projectRoot });
  const initialResult = exec(
    `npx playwright test ${projectFlags} --grep "@${grepTag}" --reporter json`,
    { cwd: projectRoot, timeout: 300000 }
  );
  const { passed: initialPassed, failed: initialFailed, failures } = parseResults(initialResult.stdout);

  if (initialFailed === 0) {
    return {
      content: [{
        type: 'text',
        text: `## e2e_heal — ${moduleName}\n\n✅ All ${initialPassed} tests passing — nothing to heal.`,
      }],
    };
  }

  // ── Inline mode (no API key) ─────────────────────────────────────────────
  // Return healer context + failure details to the host Claude, which fixes
  // steps files and re-runs tests using its own tools — no separate key needed.
  if (!apiKey) {
    const failureContexts = failures.map((f) => buildFailureContext(f, projectRoot)).join('\n\n---\n\n');
    return {
      content: [{
        type: 'text',
        text: [
          `## e2e_heal — Inline Mode (no ANTHROPIC_API_KEY)`,
          '',
          `**Module:** ${moduleName}`,
          `**Initial result:** ✅ ${initialPassed} passed | ❌ ${initialFailed} failed`,
          `**Max iterations:** ${maxIterations}`,
          '',
          '**Fix the failures below, then re-run tests. Repeat up to the max iterations.**',
          `⛔ Do NOT ask the user — fix and re-run autonomously up to ${maxIterations} times.`,
          '',
          '---',
          '',
          '## Healer Instructions',
          '',
          healerPrompt ?? '(healer prompt not found — use best judgement to fix selector mismatches)',
          '',
          '---',
          '',
          '## Failures to Fix',
          '',
          failureContexts,
          '',
          '---',
          '',
          '## Re-run Command',
          '',
          '```bash',
          `cd ${projectRoot}`,
          `npx bddgen && npx playwright test ${projectFlags} --grep "@${grepTag}"`,
          '```',
          '',
          'After fixing all failures or reaching max iterations, summarise: iterations used, fixes applied, final pass/fail count.',
        ].join('\n'),
      }],
    };
  }

  // ── API mode (ANTHROPIC_API_KEY available) ───────────────────────────────
  const summary = { iterations: 0, fixesApplied: 0, finalPassed: initialPassed, finalFailed: initialFailed };
  let lastFailures = failures;

  for (let i = 1; i <= maxIterations; i++) {
    summary.iterations = i;
    if (summary.finalFailed === 0) break;
    if (!healerPrompt) break;

    const fixed = await healIteration(lastFailures, projectRoot, healerPrompt, apiKey);
    summary.fixesApplied += fixed;
    if (fixed === 0) break;

    exec('npx bddgen', { cwd: projectRoot });
    const result = exec(
      `npx playwright test ${projectFlags} --grep "@${grepTag}" --reporter json`,
      { cwd: projectRoot, timeout: 300000 }
    );
    const { passed, failed, failures: newFailures } = parseResults(result.stdout);
    summary.finalPassed = passed;
    summary.finalFailed = failed;
    lastFailures = newFailures;
  }

  const lines = [
    `## e2e_heal — ${moduleName}`,
    '',
    `**Iterations:** ${summary.iterations}/${maxIterations}`,
    `**Fixes applied:** ${summary.fixesApplied}`,
    `**Final result:** ✅ ${summary.finalPassed} passed | ❌ ${summary.finalFailed} failed`,
  ];

  if (lastFailures.length > 0) {
    lines.push('', '### Remaining Failures (need manual review)');
    lastFailures.forEach((f) => lines.push(`- ${f.title}: \`${(f.error ?? '').slice(0, 150)}\``));
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

function inferProjects(category, moduleName, featuresDir) {
  if (category === '@Workflows') return ['setup', 'run-workflow'];
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

function parseResults(stdout) {
  let passed = 0, failed = 0, failures = [];
  try {
    const jsonMatch = stdout.match(/\{[\s\S]*?"stats"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      passed = parsed.stats?.expected ?? 0;
      failed = parsed.stats?.unexpected ?? 0;
      if (parsed.suites) failures = collectFailures(parsed.suites);
    }
  } catch { /* ignore parse errors */ }
  return { passed, failed, failures };
}

function collectFailures(suites, results = []) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== 'expected') {
          results.push({
            title: spec.title,
            file: spec.file,
            error: test.results?.[0]?.error?.message ?? '',
            selector: extractSelector(test.results?.[0]?.error?.message ?? ''),
          });
        }
      }
    }
    if (suite.suites) collectFailures(suite.suites, results);
  }
  return results;
}

function extractSelector(errorMsg) {
  const m = errorMsg.match(/locator\(['"`]([^'"`]+)['"`]\)/);
  return m ? m[1] : null;
}

function buildFailureContext(failure, projectRoot) {
  const lines = [
    `### ${failure.title}`,
    `**Error:** ${failure.error}`,
  ];

  const stepsPath = failure.file
    ?.replace('.features-gen/', 'e2e-tests/features/playwright-bdd/')
    ?.replace('.feature.spec.js', '/steps.js');
  const resolvedSteps = stepsPath ? path.resolve(projectRoot, stepsPath) : null;

  if (resolvedSteps && fs.existsSync(resolvedSteps)) {
    lines.push(`**Steps file:** \`${resolvedSteps}\``);
    lines.push('```javascript', fs.readFileSync(resolvedSteps, 'utf-8'), '```');
  }

  if (failure.selector) {
    const grepResult = exec(
      `grep -r "${failure.selector}" src/ --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" -l 2>/dev/null | head -3`,
      { cwd: projectRoot }
    );
    if (grepResult.stdout?.trim()) {
      const files = grepResult.stdout.trim().split('\n').slice(0, 3);
      lines.push('**Application source (selector context):**');
      files.forEach((f) => {
        const fullPath = path.join(projectRoot, f);
        if (fs.existsSync(fullPath)) {
          lines.push(`\`${f}\``, '```', fs.readFileSync(fullPath, 'utf-8').slice(0, 2000), '```');
        }
      });
    }
  }

  return lines.join('\n');
}

async function healIteration(failures, projectRoot, healerPrompt, apiKey) {
  let fixCount = 0;

  for (const failure of failures) {
    if (!failure.file) continue;

    // Read steps.js content
    const stepsPath = failure.file.replace('.features-gen/', 'e2e-tests/features/playwright-bdd/')
      .replace('.feature.spec.js', '/steps.js');
    const resolvedSteps = path.resolve(projectRoot, stepsPath);
    if (!fs.existsSync(resolvedSteps)) continue;
    const stepsContent = fs.readFileSync(resolvedSteps, 'utf-8');

    // Grep src/ for selector
    let sourceContext = '';
    if (failure.selector) {
      const grepResult = exec(`grep -r "${failure.selector}" src/ --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" -l 2>/dev/null | head -3`, { cwd: projectRoot });
      if (grepResult.stdout) {
        const files = grepResult.stdout.trim().split('\n').slice(0, 3);
        sourceContext = files.map((f) => {
          const fullPath = path.join(projectRoot, f);
          if (fs.existsSync(fullPath)) {
            return `\n### ${f}\n\`\`\`\n${fs.readFileSync(fullPath, 'utf-8').slice(0, 2000)}\n\`\`\``;
          }
          return '';
        }).join('\n');
      }
    }

    // Call Claude API
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });

      const userMessage = [
        `## Failing Test\n**Title:** ${failure.title}\n**Error:** ${failure.error}`,
        `\n## steps.js\n\`\`\`javascript\n${stepsContent}\n\`\`\``,
        sourceContext ? `\n## Application Source\n${sourceContext}` : '',
        '\nIdentify the selector fix and return the corrected steps.js content.',
      ].join('\n');

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: healerPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const fixedContent = extractCodeBlock(response.content[0]?.text ?? '', 'javascript');
      if (fixedContent && fixedContent !== stepsContent) {
        fs.writeFileSync(resolvedSteps, fixedContent);
        fixCount++;
      }
    } catch { /* API error — skip this failure */ }
  }

  return fixCount;
}

function readAgentPrompt(agentsDir, relativePath) {
  const fullPath = path.join(agentsDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8').replace(/^---[\s\S]*?---\n/, '').trim();
}

function extractCodeBlock(text, lang) {
  const regex = new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}
