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

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
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

  // Determine auth flag
  const installFlags = [...flags];

  if (!flags.includes('--skip-auth') && !flags.includes('--with-auth')) {
    // Interactive prompt
    const answer = await ask('  Include authentication test module? (Y/n): ');
    if (answer === 'n' || answer === 'no') {
      installFlags.push('--skip-auth');
      console.log('  → Skipping authentication module\n');
    } else {
      console.log('  → Including authentication module\n');
    }
  }

  try {
    const flagStr = installFlags.join(' ');
    execSync(`bash "${installScript}" "${targetDir}" ${flagStr}`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Installation failed:', err.message);
    process.exit(1);
  }
}

if (command === 'init') {
  runInit();
} else {
  console.log(`
  @specwright/plugin — AI-powered E2E test automation

  Usage:
    npx @specwright/plugin init [target-dir] [options]

  Options:
    --skip-auth   Skip authentication test module (login feature + auth steps)
    --with-auth   Include authentication module (default, no prompt)

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
