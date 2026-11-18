#!/usr/bin/env bash
# Checks that this repository carries the delivery playbook entry block
# (AGENTS.md) and that CLAUDE.md imports AGENTS.md. Runs locally or in CI.
# Usage: scripts/check-agent-entry.sh [repo-dir]
set -euo pipefail

dir="${1:-.}"
agents="$dir/AGENTS.md"
claude="$dir/CLAUDE.md"
fail=0

if [ ! -f "$agents" ]; then
  echo "::error::AGENTS.md is missing; add the playbook entry block (docs/playbook/templates/frontend-agents-entry.md in Company OS)."
  fail=1
else
  if ! grep -Eq '^<!-- playbook-entry v[0-9]+\.[0-9]+ start -->$' "$agents"; then
    echo "::error::AGENTS.md has no line '<!-- playbook-entry vX.Y start -->'."
    fail=1
  fi
  if ! grep -Eq '^<!-- playbook-entry v[0-9]+\.[0-9]+ end -->$' "$agents"; then
    echo "::error::AGENTS.md has no line '<!-- playbook-entry vX.Y end -->'."
    fail=1
  fi
fi

if [ ! -f "$claude" ]; then
  echo "::error::CLAUDE.md is missing; it must import AGENTS.md with a line '@AGENTS.md'."
  fail=1
elif ! grep -qx '@AGENTS.md' "$claude"; then
  echo "::error::CLAUDE.md has no line '@AGENTS.md'."
  fail=1
fi

sumfile="$dir/.github/playbook-entry.sha256"
if [ -f "$agents" ]; then
  if [ ! -f "$sumfile" ]; then
    echo "::error::.github/playbook-entry.sha256 is missing; run Company OS tools/playbook/sync-entry.mjs on this repository."
    fail=1
  else
    if command -v sha256sum >/dev/null 2>&1; then hasher="sha256sum"; else hasher="shasum -a 256"; fi
    actual=$(sed -n '/^<!-- playbook-entry v[0-9.]* start -->$/,/^<!-- playbook-entry v[0-9.]* end -->$/p' "$agents" | $hasher | cut -d' ' -f1)
    expected=$(tr -d '[:space:]' < "$sumfile")
    if [ "$actual" != "$expected" ]; then
      echo "::error::The playbook entry block in AGENTS.md was edited by hand. Change the template in Company OS and run tools/playbook/sync-entry.mjs instead."
      fail=1
    fi
  fi
fi

if [ "$fail" -ne 0 ]; then
  exit 1
fi
echo "Playbook entry present: AGENTS.md block and CLAUDE.md import."
