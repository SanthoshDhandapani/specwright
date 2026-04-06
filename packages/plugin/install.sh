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

echo "╔══════════════════════════════════════════════╗"
echo "║  E2E Automation Plugin — Installing          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Source: $PLUGIN_DIR"
echo "Target: $TARGET_DIR"
if [ "$SKIP_AUTH" = true ]; then
  echo "Option: --skip-auth (authentication module will NOT be installed)"
fi
echo ""

# ── Step 1: Copy .claude/ directory ──
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
cp "$PLUGIN_DIR/.claude_memory_MEMORY.md" "$TARGET_DIR/.claude/memory/MEMORY.md"
cp "$PLUGIN_DIR/.claude_agent-memory/playwright-test-planner/MEMORY.md" "$TARGET_DIR/.claude/agent-memory/playwright-test-planner/"
cp "$PLUGIN_DIR/.claude_agent-memory/playwright-test-healer/MEMORY.md" "$TARGET_DIR/.claude/agent-memory/playwright-test-healer/"
cp "$PLUGIN_DIR/.claude_agent-memory/execution-manager/MEMORY.md" "$TARGET_DIR/.claude/agent-memory/execution-manager/"
echo "  ✅ .claude/ installed"

# ── Step 2: Copy e2e-tests/ infrastructure ──
echo "📦 Step 2: Installing e2e-tests/ infrastructure..."
mkdir -p "$TARGET_DIR/e2e-tests/playwright/auth-storage/.auth"
mkdir -p "$TARGET_DIR/e2e-tests/playwright/generated"
mkdir -p "$TARGET_DIR/e2e-tests/playwright/test-data"
mkdir -p "$TARGET_DIR/e2e-tests/features/playwright-bdd/shared"
mkdir -p "$TARGET_DIR/e2e-tests/utils"
mkdir -p "$TARGET_DIR/e2e-tests/data"

cp "$PLUGIN_DIR/e2e-tests/playwright/fixtures.js" "$TARGET_DIR/e2e-tests/playwright/"
cp "$PLUGIN_DIR/e2e-tests/playwright/auth.setup.js" "$TARGET_DIR/e2e-tests/playwright/"
cp "$PLUGIN_DIR/e2e-tests/playwright/global.setup.js" "$TARGET_DIR/e2e-tests/playwright/"
cp "$PLUGIN_DIR/e2e-tests/playwright/global.teardown.js" "$TARGET_DIR/e2e-tests/playwright/"
cp "$PLUGIN_DIR/e2e-tests/utils/stepHelpers.js" "$TARGET_DIR/e2e-tests/utils/"
cp "$PLUGIN_DIR/e2e-tests/utils/testDataGenerator.js" "$TARGET_DIR/e2e-tests/utils/"
cp "$PLUGIN_DIR/e2e-tests/features/playwright-bdd/shared/"*.js "$TARGET_DIR/e2e-tests/features/playwright-bdd/shared/"
cp "$PLUGIN_DIR/e2e-tests/data/authenticationData.js" "$TARGET_DIR/e2e-tests/data/"
cp "$PLUGIN_DIR/e2e-tests/data/testConfig.js" "$TARGET_DIR/e2e-tests/data/"
cp "$PLUGIN_DIR/e2e-tests/instructions.js" "$TARGET_DIR/e2e-tests/"
cp "$PLUGIN_DIR/e2e-tests/instructions.example.js" "$TARGET_DIR/e2e-tests/"
cp "$PLUGIN_DIR/e2e-tests/.env.testing" "$TARGET_DIR/e2e-tests/"

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

# ── Step 5b: Install .mcp.json (MCP server config for Claude Code) ──
if [ ! -f "$TARGET_DIR/.mcp.json" ]; then
  echo "📦 Step 5b: Installing .mcp.json (MCP server config)..."
  cp "$PLUGIN_DIR/mcp.json.template" "$TARGET_DIR/.mcp.json"
  echo "  ✅ .mcp.json installed — Claude Code will discover e2e-automation tools"
else
  echo "⏭️  Step 5b: .mcp.json already exists — skipping"
fi

# ── Step 6: Merge dependencies + scripts into package.json ──
echo "📦 Step 6: Merging dependencies and scripts into package.json..."
if [ -f "$TARGET_DIR/package.json" ]; then
  node -e "
    const fs = require('fs');
    const path = require('path');

    const targetPkgPath = path.join('$TARGET_DIR', 'package.json');
    const snippetPath = path.join('$PLUGIN_DIR', 'package.json.snippet');

    const pkg = JSON.parse(fs.readFileSync(targetPkgPath, 'utf-8'));
    const snippet = JSON.parse(fs.readFileSync(snippetPath, 'utf-8'));

    // Merge devDependencies
    if (snippet.devDependencies) {
      pkg.devDependencies = { ...(pkg.devDependencies || {}), ...snippet.devDependencies };
    }

    // Merge scripts (don't overwrite existing)
    if (snippet.scripts) {
      pkg.scripts = pkg.scripts || {};
      for (const [key, val] of Object.entries(snippet.scripts)) {
        if (!pkg.scripts[key]) {
          pkg.scripts[key] = val;
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
echo "  1. Install dependencies: pnpm install"
echo ""
echo "  2. Install Playwright browsers: npx playwright install"
echo ""
echo "  3. Update e2e-tests/data/authenticationData.js"
echo "     → Set your app's login form testIDs"
echo ""
echo "  4. Update e2e-tests/data/testConfig.js"
echo "     → Set your app's routes"
echo ""
echo "  5. Set credentials in .env:"
echo "     TEST_USER_EMAIL=your-email@example.com"
echo "     TEST_USER_PASSWORD=your-password"
echo "     BASE_URL=http://localhost:5173"
echo ""
echo "  6. Start dev server and run tests:"
echo "     pnpm test:bdd:auth    # Run authentication tests"
echo "     pnpm test:bdd         # Run all tests (except auth)"
echo ""
echo "  7. Generate more tests: /e2e-automate (Claude Code CLI)"
echo ""
