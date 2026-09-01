#!/usr/bin/env bash
# Create the public AURA MCP surface.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OWNER="${AURA_GITHUB_OWNER:-aurafhe-official}"
REPO="${AURA_GITHUB_REPO:-mcp}"
NPM_SCOPE="${AURA_NPM_SCOPE:-aurafhe}"
PKG="@${NPM_SCOPE}/mcp"
API="${AFHE_API_URL:-https://api.afhe.io:8443}"

step() { printf '\n==> %s\n' "$1"; }
ok() { printf '    ok  %s\n' "$1"; }
todo() { printf '    TODO  %s\n' "$1"; }

step "1. Network"
if curl -sk --max-time 8 "$API/health" | grep -q '"ok"'; then
  ok "$API/health"
else
  todo "backend not answering at $API/health"
fi
if curl -sS --max-time 8 "$API/health" >/dev/null 2>&1; then
  ok "TLS on $API is valid"
else
  todo "renew Let's Encrypt on api.afhe.io. Until then this MCP still connects."
fi

step "2. GitHub $OWNER/$REPO"
if gh api "users/$OWNER" >/dev/null 2>&1 || gh api "orgs/$OWNER" >/dev/null 2>&1; then
  ok "github.com/$OWNER exists"
else
  todo "sign in and open https://github.com/$OWNER"
fi
if gh api "repos/$OWNER/$REPO" >/dev/null 2>&1; then
  ok "github.com/$OWNER/$REPO exists"
  todo "About fields: docs/GITHUB.md (Settings, as $OWNER)"
else
  todo "browser: https://github.com/new  owner=$OWNER  name=$REPO  public  no README"
  printf '        then: bash %s/scripts/sync-mcp.sh\n' "$ROOT"
fi

step "3. npm $PKG"
if npm view "$PKG" version >/dev/null 2>&1; then
  ok "$PKG is on npm $(npm view "$PKG" version)"
else
  todo "not published — install stays github:aurafhe-official/mcp"
fi

step "4. Hosted MCP URL (optional, not live)"
todo "only if you want a team URL: DNS mcp.afhe.io + deploy/compose.yml"

step "5. What users paste"
cat <<'JSON'
{
  "mcpServers": {
    "aura": {
      "command": "npx",
      "args": ["-y", "github:aurafhe-official/mcp"]
    }
  }
}
JSON

step "Done"
printf 'Runbook: docs/LAUNCH.md\n'
