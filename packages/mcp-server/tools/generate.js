import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

export const definition = {
  name: 'e2e_generate',
  description:
    'Generate Playwright BDD .feature file and steps.js from an approved test plan. Reads plan + seed + stepHelpers, calls Claude API internally, writes generated files to the project.',
  inputSchema: {
    type: 'object',
    properties: {
      planFilePath: {
        type: 'string',
        description: 'Absolute or project-relative path to the approved test plan .md file',
      },
      moduleName: { type: 'string', description: 'e.g. @HomePage' },
      category: { type: 'string', description: '@Modules or @Workflows' },
      fileName: { type: 'string', description: 'Output filename base e.g. homepage' },
    },
    required: ['planFilePath', 'moduleName', 'category', 'fileName'],
  },
};

export async function handler({ planFilePath, moduleName, category, fileName }) {
  const config = getConfig();
  const { projectRoot, featuresDir, seedFilePath } = config;

  // Resolve plan file path
  const resolvedPlan = path.isAbsolute(planFilePath)
    ? planFilePath
    : path.join(projectRoot, planFilePath);

  if (!fs.existsSync(resolvedPlan)) {
    return {
      content: [{
        type: 'text',
        text: [
          `❌ Plan file not found: ${resolvedPlan}`,
          '',
          '### NEXT_ACTION: ASK_USER',
          'The plan file was not found. Ask the user to confirm the plan file path or run e2e_plan first.',
        ].join('\n'),
      }],
    };
  }

  // Read context files (needed for both API and inline modes)
  const planContent = fs.readFileSync(resolvedPlan, 'utf-8');
  const seedContent = fs.existsSync(seedFilePath)
    ? fs.readFileSync(seedFilePath, 'utf-8')
    : '(no seed file — explore: false mode)';

  const stepHelpersPath = path.join(projectRoot, 'e2e-tests/utils/stepHelpers.js');
  const stepHelpersContent = fs.existsSync(stepHelpersPath)
    ? fs.readFileSync(stepHelpersPath, 'utf-8')
    : '';

  // Read agent prompts from installed plugin
  const agentsDir = path.join(projectRoot, '.claude/agents');
  const bddGeneratorPrompt = readAgentPrompt(agentsDir, 'bdd-generator.md');
  const codeGeneratorPrompt = readAgentPrompt(agentsDir, 'playwright/code-generator.md');

  if (!bddGeneratorPrompt || !codeGeneratorPrompt) {
    return {
      content: [{
        type: 'text',
        text: `❌ Agent prompt files not found in ${agentsDir}. Ensure @specwright/plugin is installed (npx @specwright/plugin init).`,
      }],
    };
  }

  // Output paths
  const outputDir = path.join(featuresDir, category, moduleName);
  const featurePath = path.join(outputDir, `${fileName}.feature`);
  const stepsPath = path.join(outputDir, 'steps.js');
  fs.mkdirSync(outputDir, { recursive: true });

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── Inline mode (no API key) ─────────────────────────────────────────────
  // Return all context + generation instructions so Claude (already running in
  // Claude Desktop) generates and writes the files itself — no separate key needed.
  if (!apiKey) {
    return {
      content: [{
        type: 'text',
        text: [
          '## e2e_generate — Inline Mode (no ANTHROPIC_API_KEY)',
          '',
          '**Generate the following two files and write them to disk using the Write tool.**',
          '⛔ Do NOT create artifacts or show content in chat. Write directly to the file paths below.',
          '',
          `**Feature file path:** \`${featurePath}\``,
          `**Steps file path:**   \`${stepsPath}\``,
          '',
          '---',
          '',
          '## BDD Generator Instructions',
          '',
          bddGeneratorPrompt,
          '',
          '---',
          '',
          '## Code Generator Instructions',
          '',
          codeGeneratorPrompt,
          '',
          '---',
          '',
          '## Plan File',
          '',
          planContent,
          '',
          '## Seed File (validated selectors)',
          '',
          '```javascript',
          seedContent,
          '```',
          '',
          '## stepHelpers.js (FIELD_TYPES reference)',
          '',
          '```javascript',
          stepHelpersContent,
          '```',
          '',
          '---',
          '',
          '**Instructions:**',
          '1. Follow the BDD Generator Instructions to produce the `.feature` file content',
          '2. Follow the Code Generator Instructions to produce the `steps.js` content',
          `3. Write the feature content to: \`${featurePath}\``,
          `4. Write the steps content to: \`${stepsPath}\``,
          '5. Confirm with: "✅ Files written to disk at the above paths"',
        ].join('\n'),
      }],
    };
  }

  // ── API mode (ANTHROPIC_API_KEY available) ───────────────────────────────
  const userMessage = [
    '## Plan File\n', planContent,
    '\n## Seed File (validated selectors)\n```javascript\n', seedContent, '\n```',
    '\n## stepHelpers.js (FIELD_TYPES reference)\n```javascript\n', stepHelpersContent, '\n```',
  ].join('');

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    // Step 1: Generate .feature file
    const featureResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: bddGeneratorPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const featureRaw = featureResponse.content[0]?.text ?? '';
    const featureContent = extractCodeBlock(featureRaw, 'gherkin') || featureRaw;

    const featurePath = path.join(outputDir, `${fileName}.feature`);
    fs.writeFileSync(featurePath, featureContent);

    // Step 2: Generate steps.js
    const codeMessage = [
      userMessage,
      '\n## Generated Feature File\n```gherkin\n', featureContent, '\n```',
      '\nNow generate the steps.js implementation for the above feature file.',
    ].join('');

    const stepsResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: codeGeneratorPrompt,
      messages: [{ role: 'user', content: codeMessage }],
    });

    const stepsRaw = stepsResponse.content[0]?.text ?? '';
    const stepsContent = extractCodeBlock(stepsRaw, 'javascript') || stepsRaw;

    const stepsPath = path.join(outputDir, 'steps.js');
    fs.writeFileSync(stepsPath, stepsContent);

    // Count scenarios
    const scenarioCount = (featureContent.match(/^\s*(Scenario:|Scenario Outline:)/gm) ?? []).length;

    return {
      content: [{
        type: 'text',
        text: [
          `## e2e_generate — Complete ✅`,
          '',
          `**Module:** ${moduleName}`,
          `**Scenarios generated:** ${scenarioCount}`,
          '',
          '**Files written:**',
          `- \`${featurePath}\``,
          `- \`${stepsPath}\``,
          '',
          'Run `e2e_execute` with bdd mode to run the generated tests.',
        ].join('\n'),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `❌ Generation failed: ${err.message}` }],
    };
  }
}

function readAgentPrompt(agentsDir, relativePath) {
  const fullPath = path.join(agentsDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const content = fs.readFileSync(fullPath, 'utf-8');
  // Strip YAML frontmatter (--- ... ---) to get the pure system prompt
  return content.replace(/^---[\s\S]*?---\n/, '').trim();
}

function extractCodeBlock(text, lang) {
  const regex = new RegExp('```' + (lang === 'gherkin' ? '(?:gherkin|feature)?' : lang) + '\\n([\\s\\S]*?)```', 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}
