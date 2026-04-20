#!/usr/bin/env bash
set -euo pipefail

TARGET=${1:-$(pwd)}
OVERLAY_DIR="$(cd "$(dirname "$0")" && pwd)"

# Verify base plugin is installed
if [ ! -f "$TARGET/e2e-tests/playwright/fixtures.js" ]; then
  echo "ERROR: @specwright/plugin not installed. Run first: npx @specwright/plugin init"
  exit 1
fi

# Copy all overrides into target project
cp -r "$OVERLAY_DIR/overrides/." "$TARGET/"

# Ensure AUTH_STRATEGY=email-password in .env.testing
ENV_FILE="$TARGET/e2e-tests/.env.testing"
if [ -f "$ENV_FILE" ]; then
  if grep -q "^AUTH_STRATEGY=" "$ENV_FILE"; then
    sed -i '' 's/^AUTH_STRATEGY=.*/AUTH_STRATEGY=email-password/' "$ENV_FILE"
  else
    echo "AUTH_STRATEGY=email-password" >> "$ENV_FILE"
  fi
fi

# Copy overlay manifest
cp "$OVERLAY_DIR/specwright.plugin.json" "$TARGET/"

echo "✓ @specwright/plugin-mui overlay installed"
echo ""
echo "  Next steps:"
echo "  1. Set credentials in e2e-tests/.env.testing:"
echo "     TEST_USER_EMAIL=..."
echo "     TEST_USER_PASSWORD=..."
echo "  2. Run: pnpm dev"
echo "  3. Run: /e2e-automate"
