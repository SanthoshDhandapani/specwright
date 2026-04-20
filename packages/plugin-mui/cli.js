#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('--')) || 'install';

function resolveTarget(commandName) {
  const idx = args.indexOf(commandName);
  return path.resolve(args.find((a, i) => i > idx && !a.startsWith('--')) || process.cwd());
}

function runInstall() {
  const target = resolveTarget('install');
  const installScript = path.join(__dirname, 'install.sh');

  try {
    execSync(`bash "${installScript}" "${target}"`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

function runUpdate() {
  const target = resolveTarget('update');

  if (!fs.existsSync(path.join(target, 'e2e-tests/playwright/fixtures.js'))) {
    console.error('Error: @specwright/plugin not installed in this project. Run init + install first.');
    process.exit(1);
  }

  console.log('\n  @specwright/plugin-mui — Updating\n');
  console.log(`  Target: ${target}\n`);

  // Step 1: Update base plugin framework files
  console.log('  Step 1/2: Updating base @specwright/plugin framework files...\n');
  try {
    execSync(`npx @specwright/plugin@latest update "${target}"`, { stdio: 'inherit' });
  } catch {
    console.error('\n  ✗ Base plugin update failed.');
    process.exit(1);
  }

  // Step 2: Re-apply MUI overlay overrides
  console.log('\n  Step 2/2: Re-applying @specwright/plugin-mui overrides...\n');
  const installScript = path.join(__dirname, 'install.sh');
  try {
    execSync(`bash "${installScript}" "${target}"`, { stdio: 'inherit' });
  } catch {
    console.error('\n  ✗ MUI overlay update failed.');
    process.exit(1);
  }

  console.log('\n  ✅ Update complete — base + MUI overlay both updated.\n');
}

if (command === 'install') {
  runInstall();
} else if (command === 'update') {
  runUpdate();
} else {
  console.log(`
  @specwright/plugin-mui — Material UI overlay for @specwright/plugin

  Usage:
    npx @specwright/plugin-mui install [target-dir]
    npx @specwright/plugin-mui update  [target-dir]

  Commands:
    install  Apply MUI overlay on top of an installed @specwright/plugin base
    update   Update base @specwright/plugin framework files, then re-apply MUI overrides

  Requires @specwright/plugin >= 0.3.8 installed first:
    npx @specwright/plugin init
  `);
}
