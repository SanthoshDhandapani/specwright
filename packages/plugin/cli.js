#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('--'));
const flags = args.filter(a => a.startsWith('--'));

// Extract target dir: first non-flag arg after 'init', or cwd
const initIndex = args.indexOf('init');
const targetDir = args.find((a, i) => i > initIndex && !a.startsWith('--')) || process.cwd();

// Check if running in non-interactive mode (desktop app or CI)
const nonInteractive = flags.includes('--non-interactive') || !process.stdin.isTTY;

function ask(question, defaultValue) {
  if (nonInteractive) return Promise.resolve(defaultValue || '');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed || defaultValue || '');
    });
  });
}

async function runInit() {
  const installScript = path.join(__dirname, 'install.sh');

  if (!fs.existsSync(installScript)) {
    console.error('Error: install.sh not found in plugin package.');
    process.exit(1);
  }

  console.log(`\n  Specwright E2E Plugin Installer\n`);
  console.log(`  Target: ${targetDir}\n`);

  const installFlags = [...flags.filter(f => f !== '--non-interactive')];
  const installEnv = { ...process.env };

  // ── Base URL ──
  if (!flags.includes('--base-url') && !nonInteractive) {
    const baseUrl = await ask('  Base URL of your application', 'http://localhost:3000');
    if (baseUrl) {
      installEnv.SPECWRIGHT_BASE_URL = baseUrl;
      console.log(`  → Base URL: ${baseUrl}\n`);
    }
  } else {
    const baseUrlFlag = flags.find(f => f.startsWith('--base-url='));
    if (baseUrlFlag) {
      installEnv.SPECWRIGHT_BASE_URL = baseUrlFlag.split('=')[1];
    }
  }

  // ── Auth module ──
  if (!flags.includes('--skip-auth') && !flags.includes('--with-auth')) {
    if (nonInteractive) {
      // Default to with-auth in non-interactive mode
      console.log('  → Including authentication module (default)\n');
    } else {
      const answer = await ask('  Include authentication test module? (Y/n)', 'Y');
      if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
        installFlags.push('--skip-auth');
        console.log('  → Skipping authentication module\n');
      } else {
        console.log('  → Including authentication module\n');
      }
    }
  }

  // ── Package manager ──
  if (!flags.includes('--pm') && !nonInteractive) {
    const detected = detectPackageManager(targetDir);
    const pm = await ask('  Package manager', detected);
    if (pm && ['pnpm', 'npm', 'yarn'].includes(pm.toLowerCase())) {
      installEnv.SPECWRIGHT_PM = pm.toLowerCase();
      console.log(`  → Package manager: ${pm.toLowerCase()}\n`);
    }
  } else {
    const pmFlag = flags.find(f => f.startsWith('--pm='));
    if (pmFlag) {
      installEnv.SPECWRIGHT_PM = pmFlag.split('=')[1];
    }
  }

  try {
    const flagStr = installFlags
      .filter(f => !f.startsWith('--base-url=') && !f.startsWith('--pm='))
      .join(' ');
    execSync(`bash "${installScript}" "${targetDir}" ${flagStr}`, {
      stdio: 'inherit',
      env: installEnv,
    });
  } catch (err) {
    console.error('Installation failed:', err.message);
    process.exit(1);
  }
}

/** Detect which package manager the project uses */
function detectPackageManager(dir) {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
  // Check parent dirs (monorepo)
  let current = dir;
  for (let i = 0; i < 5; i++) {
    const parent = path.dirname(current);
    if (parent === current) break;
    if (fs.existsSync(path.join(parent, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(parent, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(parent, 'package-lock.json'))) return 'npm';
    current = parent;
  }
  return 'pnpm';
}

if (command === 'init') {
  runInit();
} else {
  console.log(`
  @specwright/plugin — AI-powered E2E test automation

  Usage:
    npx @specwright/plugin init [target-dir] [options]

  Options:
    --skip-auth           Skip authentication test module
    --with-auth           Include authentication module (default, no prompt)
    --base-url=URL        Set base URL (e.g., --base-url=http://localhost:3000)
    --pm=MANAGER          Set package manager: pnpm, npm, or yarn
    --non-interactive     Skip all prompts, use defaults (for CI/desktop app)

  This installs the Playwright BDD framework, Claude Code agents,
  MCP server config, and shared step definitions into your project.

  After install:
    pnpm install                    Install dependencies
    npx playwright install          Install browsers
    pnpm test:bdd                   Run tests
    claude → /e2e-automate          Generate tests with AI
    claude → /e2e-desktop-automate  Explore & plan via browser

  More info: https://github.com/SanthoshDhandapani/specwright
  `);
}
