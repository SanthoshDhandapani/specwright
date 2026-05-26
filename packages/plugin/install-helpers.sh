#!/usr/bin/env bash
# @specwright/plugin install helpers — shared bash functions for plugin
# install scripts and overlay install scripts.
#
# Sourced by:
#   - Base plugin's install.sh (uses safe_copy + force_copy internally)
#   - Overlay install.sh files (e.g. fourkites-specwright-e2e-automator)
#     after the base plugin install completes — at that point this file
#     lives at <target>/.specwright/install-helpers.sh
#
# Why centralise:
#   Without this, every overlay reinvents safe-copy / walker logic and
#   gets edge cases (mkdir -p, mtime preservation, seed detection) wrong
#   in different ways.
#
# Public API:
#   force_copy SRC DST          — always overwrite (framework files)
#   safe_copy  SRC DST          — only if DST missing (user-configurable)
#   walk_overrides SRC_DIR DST_DIR [SEED_PATTERN...]
#                               — recursive copy, force by default,
#                                 safe-copy for paths matching any SEED_PATTERN
#
# All functions are POSIX-bash compatible. No rsync, jq, find -printf, or
# GNU-only flags. Works on macOS, Linux, Alpine, BSD.

# Force-copy SRC to DST. Always overwrites. Creates parent dirs.
# Use for framework files the plugin must control on every update.
force_copy() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

# Safe-copy SRC to DST. Skips if DST already exists.
# Use for user-configurable files (.env.testing, instructions.js, etc.)
# so subsequent updates don't clobber the user's customisations.
safe_copy() {
  local src="$1" dst="$2"
  if [ -e "$dst" ]; then
    return 0
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

# Walk a source tree and copy each file to the target, applying force-copy
# semantics by default but safe-copy semantics for any file whose RELATIVE
# path (under SRC_DIR) matches one of the SEED_PATTERN arguments.
#
# Usage:
#   walk_overrides "/path/to/overrides" "/path/to/target" \
#     "e2e-tests/features/playwright-bdd/@Modules/@Authentication/authentication.feature" \
#     "e2e-tests/features/playwright-bdd/@Modules/@Authentication/steps.js"
#
# Pattern matching: exact relative-path equality only (no glob).
# Future: extend to globs if any consumer needs it.
walk_overrides() {
  local src_root="$1" dst_root="$2"
  shift 2
  local seed_patterns=("$@")

  local copied=0 skipped=0
  while IFS= read -r src; do
    local rel="${src#$src_root/}"
    local dst="$dst_root/$rel"

    local is_seed=false
    local pat
    for pat in "${seed_patterns[@]}"; do
      if [ "$rel" = "$pat" ]; then
        is_seed=true
        break
      fi
    done

    if $is_seed && [ -e "$dst" ]; then
      echo "  ⏭️  $rel (seed — preserving user version)"
      skipped=$((skipped + 1))
      continue
    fi

    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    copied=$((copied + 1))
  done < <(find "$src_root" -type f)

  echo "  ✓ $copied file(s) copied, $skipped seed file(s) preserved"
}
