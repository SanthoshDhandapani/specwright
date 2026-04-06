import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_status',
  description:
    'Get the current E2E pipeline status — shows which phases are complete (config, exploration, plans, test results).',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handler() {
  const config = getConfig();

  // Check instructions.js
  let configStatus = 'Not configured';
  let configEntries = 0;
  if (fs.existsSync(config.instructionsPath)) {
    const content = fs.readFileSync(config.instructionsPath, 'utf-8');
    configEntries = (content.match(/moduleName/g) || []).length;
    configStatus = configEntries > 0 ? `${configEntries} entries` : 'Empty (no entries)';
  }

  // Check seed file
  const hasSeed = fs.existsSync(config.seedFilePath);
  let seedInfo = 'Not created';
  if (hasSeed) {
    const stat = fs.statSync(config.seedFilePath);
    seedInfo = `Exists (${Math.round(stat.size / 1024)}KB, modified ${stat.mtime.toISOString().split('T')[0]})`;
  }

  // Check plans
  let planFiles = [];
  if (fs.existsSync(config.plansDir)) {
    planFiles = fs.readdirSync(config.plansDir).filter((f) => f.endsWith('-plan.md'));
  }
  const plansStatus = planFiles.length > 0 ? planFiles.map((f) => `- ${f}`).join('\n') : 'None';

  // Check test results
  let testStatus = 'No results';
  const resultsPath = path.join(config.reportsDir, 'json/results.json');
  if (fs.existsSync(resultsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      const suites = data.suites || [];
      const specs = suites.flatMap((s) => s.specs || []);
      const passed = specs.filter((s) => s.ok).length;
      const failed = specs.filter((s) => !s.ok).length;
      const total = specs.length;
      const duration = Math.round((data.stats?.duration || 0) / 1000);
      testStatus = `${passed} passed, ${failed} failed, ${total} total (${duration}s)`;

      if (failed > 0) {
        const failures = specs
          .filter((s) => !s.ok)
          .map((s) => `  - ${s.title}`)
          .slice(0, 5);
        testStatus += `\n${failures.join('\n')}`;
      }
    } catch {
      testStatus = 'Error reading results';
    }
  }

  // Check existing modules
  const modulesDir = path.join(config.featuresDir, '@Modules');
  let moduleCount = 0;
  if (fs.existsSync(modulesDir)) {
    moduleCount = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('@')).length;
  }

  const text = [
    `## E2E Pipeline Status`,
    ``,
    `| Phase | Status |`,
    `|-------|--------|`,
    `| Configuration | ${configStatus} |`,
    `| Exploration (seed file) | ${seedInfo} |`,
    `| Test Plans | ${planFiles.length} plan(s) |`,
    `| Test Modules | ${moduleCount} module(s) |`,
    `| Last Test Run | ${testStatus.split('\n')[0]} |`,
    ``,
    planFiles.length > 0 ? `### Plans\n${plansStatus}\n` : '',
    testStatus.includes('\n') ? `### Recent Failures\n${testStatus.split('\n').slice(1).join('\n')}\n` : '',
    `**Base URL:** ${config.baseURL}`,
    `**View report:** \`pnpm report:playwright\``,
  ].join('\n');

  return { content: [{ type: 'text', text }] };
}
