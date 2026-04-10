#!/bin/bash
# E2E Automation Plugin — Installation Script
# Run from your project root: bash path/to/e2e-plugin/install.sh
# Options:
#   --skip-auth    Skip installing authentication test module

set -e

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR=""
SKIP_AUTH=false

# Parse arguments — first non-flag argument is the target directory
for arg in "$@"; do
  case $arg in
    --skip-auth) SKIP_AUTH=true ;;
    -*) ;; # skip unknown flags
    *) [ -z "$TARGET_DIR" ] && TARGET_DIR="$arg" ;;
  esac
done

# Default to current directory if no target specified
TARGET_DIR="${TARGET_DIR:-$(pwd)}"

# Read config from environment (set by cli.js interactive prompts)
BASE_URL="${SPECWRIGHT_BASE_URL:-http://localhost:5173}"
PM="${SPECWRIGHT_PM:-pnpm}"
AUTH_STRATEGY="${SPECWRIGHT_AUTH_STRATEGY:-email-password}"

# Helper: copy file only if target doesn't exist (safe for user-customized files)
safe_copy() {
  local src="$1" dst="$2"
  if [ ! -f "$dst" ]; then
    cp "$src" "$dst"
  else
    echo "  ⏭️  $(basename "$dst") already exists — skipping"
  fi
}

echo "╔══════════════════════════════════════════════╗"
echo "║  Specwright E2E Plugin — Installing           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Source: $PLUGIN_DIR"
echo "Target: $TARGET_DIR"
if [ "$SKIP_AUTH" = true ]; then
  echo "Option: --skip-auth (authentication module will NOT be installed)"
fi
echo ""

# ── Step 1: Copy .claude/ directory ──
# Always overwrite agents/skills/rules — these are framework code, not user data
echo "📦 Step 1: Installing .claude/ (agents, skills, rules)..."
mkdir -p "$TARGET_DIR/.claude/agents/playwright"
mkdir -p "$TARGET_DIR/.claude/skills"
mkdir -p "$TARGET_DIR/.claude/rules"
mkdir -p "$TARGET_DIR/.claude/memory"
mkdir -p "$TARGET_DIR/.claude/agent-memory/playwright-test-planner"
mkdir -p "$TARGET_DIR/.claude/agent-memory/playwright-test-healer"
mkdir -p "$TARGET_DIR/.claude/agent-memory/execution-manager"

cp -r "$PLUGIN_DIR/.claude_agents/"* "$TARGET_DIR/.claude/agents/"
cp -r "$PLUGIN_DIR/.claude_skills/"* "$TARGET_DIR/.claude/skills/"
cp -r "$PLUGIN_DIR/.claude_rules/"* "$TARGET_DIR/.claude/rules/"
cp "$PLUGIN_DIR/.claude_README.md" "$TARGET_DIR/.claude/README.md"
# Memory files: only create if missing (preserve learned patterns)
safe_copy "$PLUGIN_DIR/.claude_memory_MEMORY.md" "$TARGET_DIR/.claude/memory/MEMORY.md"
safe_copy "$PLUGIN_DIR/.claude_agent-memory/playwright-test-planner/MEMORY.md" "$TARGET_DIR/.claude/agent-memory/playwright-test-planner/MEMORY.md"
safe_copy "$PLUGIN_DIR/.claude_agent-memory/playwright-test-healer/MEMORY.md" "$TARGET_DIR/.claude/agent-memory/playwright-test-healer/MEMORY.md"
safe_copy "$PLUGIN_DIR/.claude_agent-memory/execution-manager/MEMORY.md" "$TARGET_DIR/.claude/agent-memory/execution-manager/MEMORY.md"
echo "  ✅ .claude/ installed"

# ── Step 2: Copy e2e-tests/ infrastructure ──
echo "📦 Step 2: Installing e2e-tests/ infrastructure..."
mkdir -p "$TARGET_DIR/e2e-tests/playwright/auth-storage/.auth"
mkdir -p "$TARGET_DIR/e2e-tests/playwright/generated"
mkdir -p "$TARGET_DIR/e2e-tests/playwright/test-data"
mkdir -p "$TARGET_DIR/e2e-tests/features/playwright-bdd/shared"
mkdir -p "$TARGET_DIR/e2e-tests/utils"
mkdir -p "$TARGET_DIR/e2e-tests/data"

# Framework files: always overwrite (these are the framework, not user code)
cp "$PLUGIN_DIR/e2e-tests/playwright/fixtures.js" "$TARGET_DIR/e2e-tests/playwright/"
cp "$PLUGIN_DIR/e2e-tests/playwright/auth.setup.js" "$TARGET_DIR/e2e-tests/playwright/"
cp "$PLUGIN_DIR/e2e-tests/playwright/global.setup.js" "$TARGET_DIR/e2e-tests/playwright/"
cp "$PLUGIN_DIR/e2e-tests/playwright/global.teardown.js" "$TARGET_DIR/e2e-tests/playwright/"

# Auth strategy modules
mkdir -p "$TARGET_DIR/e2e-tests/playwright/auth-strategies"
cp "$PLUGIN_DIR/e2e-tests/playwright/auth-strategies/"*.js "$TARGET_DIR/e2e-tests/playwright/auth-strategies/"
cp "$PLUGIN_DIR/e2e-tests/utils/stepHelpers.js" "$TARGET_DIR/e2e-tests/utils/"
cp "$PLUGIN_DIR/e2e-tests/utils/testDataGenerator.js" "$TARGET_DIR/e2e-tests/utils/"
cp "$PLUGIN_DIR/e2e-tests/features/playwright-bdd/shared/"*.js "$TARGET_DIR/e2e-tests/features/playwright-bdd/shared/"

# User-configurable files: only create if missing (never overwrite user's config)
safe_copy "$PLUGIN_DIR/e2e-tests/data/authenticationData.js" "$TARGET_DIR/e2e-tests/data/authenticationData.js"
safe_copy "$PLUGIN_DIR/e2e-tests/data/testConfig.js" "$TARGET_DIR/e2e-tests/data/testConfig.js"
safe_copy "$PLUGIN_DIR/e2e-tests/instructions.js" "$TARGET_DIR/e2e-tests/instructions.js"
safe_copy "$PLUGIN_DIR/e2e-tests/instructions.example.js" "$TARGET_DIR/e2e-tests/instructions.example.js"
safe_copy "$PLUGIN_DIR/e2e-tests/.env.testing" "$TARGET_DIR/e2e-tests/.env.testing"

# Update BASE_URL in .env.testing with user-provided value (only on fresh install)
if [ "$BASE_URL" != "http://localhost:5173" ]; then
  sed -i.bak "s|^BASE_URL=.*|BASE_URL=$BASE_URL|" "$TARGET_DIR/e2e-tests/.env.testing"
  rm -f "$TARGET_DIR/e2e-tests/.env.testing.bak"
  echo "  → BASE_URL set to $BASE_URL"
fi

# Update AUTH_STRATEGY in .env.testing with user-selected strategy
if [ "$AUTH_STRATEGY" != "email-password" ]; then
  sed -i.bak "s|^AUTH_STRATEGY=.*|AUTH_STRATEGY=$AUTH_STRATEGY|" "$TARGET_DIR/e2e-tests/.env.testing"
  rm -f "$TARGET_DIR/e2e-tests/.env.testing.bak"
  echo "  → AUTH_STRATEGY set to $AUTH_STRATEGY"
fi

# Gitkeep files + directory stubs
touch "$TARGET_DIR/e2e-tests/playwright/auth-storage/.auth/.gitkeep"
touch "$TARGET_DIR/e2e-tests/playwright/generated/.gitkeep"
touch "$TARGET_DIR/e2e-tests/playwright/test-data/.gitkeep"
mkdir -p "$TARGET_DIR/e2e-tests/features/playwright-bdd/@Modules"
mkdir -p "$TARGET_DIR/e2e-tests/features/playwright-bdd/@Workflows"
touch "$TARGET_DIR/e2e-tests/features/playwright-bdd/@Modules/.gitkeep"
touch "$TARGET_DIR/e2e-tests/features/playwright-bdd/@Workflows/.gitkeep"
echo "  ✅ e2e-tests/ infrastructure installed"

# ── Step 3: Install authentication module (unless --skip-auth) ──
if [ "$SKIP_AUTH" = true ]; then
  echo "⏭️  Step 3: Authentication module — SKIPPED (--skip-auth)"
else
  echo "📦 Step 3: Installing authentication test module..."
  mkdir -p "$TARGET_DIR/e2e-tests/features/playwright-bdd/@Modules/@Authentication"
  cp "$PLUGIN_DIR/e2e-tests/features/playwright-bdd/@Modules/@Authentication/authentication.feature" \
     "$TARGET_DIR/e2e-tests/features/playwright-bdd/@Modules/@Authentication/"
  cp "$PLUGIN_DIR/e2e-tests/features/playwright-bdd/@Modules/@Authentication/steps.js" \
     "$TARGET_DIR/e2e-tests/features/playwright-bdd/@Modules/@Authentication/"
  echo "  ✅ @Authentication module installed (7 scenarios)"
fi

# ── Step 4: Copy playwright config ──
echo "📦 Step 4: Installing playwright.config.ts..."
if [ -f "$TARGET_DIR/playwright.config.ts" ]; then
  echo "  ⚠️  playwright.config.ts already exists — backed up to playwright.config.ts.bak"
  cp "$TARGET_DIR/playwright.config.ts" "$TARGET_DIR/playwright.config.ts.bak"
fi
cp "$PLUGIN_DIR/playwright.config.ts" "$TARGET_DIR/"
echo "  ✅ playwright.config.ts installed"

# ── Step 5: Copy documentation ──
echo "📦 Step 5: Installing documentation..."
cp "$PLUGIN_DIR/README-TESTING.md" "$TARGET_DIR/"
echo "  ✅ README-TESTING.md installed"

# ── Step 5b: Merge .mcp.json (MCP server config for Claude Code) ──
echo "📦 Step 5b: Configuring .mcp.json (MCP server config)..."
if [ ! -f "$TARGET_DIR/.mcp.json" ]; then
  cp "$PLUGIN_DIR/mcp.json.template" "$TARGET_DIR/.mcp.json"
  echo "  ✅ .mcp.json created — Claude Code will discover e2e-automation tools"
else
  # Merge: add e2e-automation server if not already present
  node -e "
    const fs = require('fs');
    const path = require('path');
    const targetPath = path.join('$TARGET_DIR', '.mcp.json');
    const templatePath = path.join('$PLUGIN_DIR', 'mcp.json.template');
    try {
      const target = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
      target.mcpServers = target.mcpServers || {};
      // Add specwright servers without overwriting existing entries
      for (const [name, config] of Object.entries(template.mcpServers || {})) {
        if (!target.mcpServers[name]) {
          target.mcpServers[name] = config;
          console.log('  ✅ Added MCP server: ' + name);
        } else {
          console.log('  ⏭️  MCP server ' + name + ' already configured — skipping');
        }
      }
      fs.writeFileSync(targetPath, JSON.stringify(target, null, 2) + '\n');
    } catch (err) {
      console.log('  ⚠️  Could not merge .mcp.json: ' + err.message);
    }
  "
fi

# ── Step 6: Merge dependencies + scripts into package.json ──
echo "📦 Step 6: Merging dependencies and scripts into package.json..."
if [ -f "$TARGET_DIR/package.json" ]; then
  node -e "
    const fs = require('fs');
    const path = require('path');

    const targetPkgPath = path.join('$TARGET_DIR', 'package.json');
    const snippetPath = path.join('$PLUGIN_DIR', 'package.json.snippet');
    const pm = '$PM';

    const pkg = JSON.parse(fs.readFileSync(targetPkgPath, 'utf-8'));
    const snippet = JSON.parse(fs.readFileSync(snippetPath, 'utf-8'));

    // Merge devDependencies
    if (snippet.devDependencies) {
      pkg.devDependencies = { ...(pkg.devDependencies || {}), ...snippet.devDependencies };
    }

    // Merge scripts (don't overwrite existing)
    // Replace 'pnpm' with the user's package manager in script values
    if (snippet.scripts) {
      pkg.scripts = pkg.scripts || {};
      for (const [key, val] of Object.entries(snippet.scripts)) {
        if (!pkg.scripts[key]) {
          pkg.scripts[key] = pm === 'pnpm' ? val : val.replace(/pnpm /g, pm + ' ');
        }
      }
    }

    fs.writeFileSync(targetPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('  ✅ package.json updated (devDependencies + scripts merged)');
  "
else
  echo "  ⚠️  No package.json found in target — skipping dependency merge"
  echo "     Manually merge contents of package.json.snippet into your package.json"
fi

# ── Step 7: Append .gitignore entries ──
echo "📦 Step 7: Updating .gitignore..."
if [ -f "$TARGET_DIR/.gitignore" ]; then
  # Only append lines that don't already exist
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    [[ "$line" == \#* ]] && continue
    grep -qF "$line" "$TARGET_DIR/.gitignore" 2>/dev/null || echo "$line" >> "$TARGET_DIR/.gitignore"
  done < "$PLUGIN_DIR/.gitignore.snippet"
  echo "  ✅ .gitignore updated"
else
  cp "$PLUGIN_DIR/.gitignore.snippet" "$TARGET_DIR/.gitignore"
  echo "  ✅ .gitignore created"
fi

# ── Step 8: Create migrations/files directory ──
mkdir -p "$TARGET_DIR/e2e-tests/data/migrations/files"
touch "$TARGET_DIR/e2e-tests/data/migrations/files/.gitkeep"

# ── Done ──
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Installation Complete                        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "📋 Next steps:"
echo ""
echo "  1. Install dependencies: $PM install"
echo ""
echo "  2. Install Playwright browsers: npx playwright install"
echo ""
echo "  3. Update e2e-tests/data/testConfig.js"
echo "     → Set your app's routes"
echo ""
echo "  4. Set credentials in e2e-tests/.env.testing:"
echo "     TEST_USER_EMAIL=your-email@example.com"
echo "     TEST_USER_PASSWORD=your-password"
echo ""
echo "  5. Start dev server and run tests:"
echo "     $PM test:bdd:auth    # Run authentication tests"
echo "     $PM test:bdd         # Run all tests (except auth)"
echo ""
echo "  6. Generate more tests: /e2e-automate (Claude Code CLI)"
echo ""
