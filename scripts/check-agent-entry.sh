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

if [ "$fail" -ne 0 ]; then
  exit 1
fi
echo "Playbook entry present: AGENTS.md block and CLAUDE.md import."
