#!/usr/bin/env bash
# Push this checkout to github.com/aurafhe-official/mcp (main).
# Must run as GitHub user aurafhe-official (not genevaprojects).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
URL="${AURA_MCP_REMOTE:-https://github.com/aurafhe-official/mcp.git}"
if git remote get-url official >/dev/null 2>&1; then
  git remote set-url official "$URL"
else
  git remote add official "$URL"
fi
who="$(gh api user --jq .login 2>/dev/null || true)"
if [ -n "$who" ] && [ "$who" != "aurafhe-official" ]; then
  printf 'git/gh is %s — push needs aurafhe-official.\n' "$who"
  printf '  gh auth logout --hostname github.com && gh auth login\n'
  exit 1
fi
gh auth setup-git 2>/dev/null || true
git push -u official HEAD:main
