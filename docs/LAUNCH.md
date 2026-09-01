# Launch AURA MCP

GitHub account [aurafhe-official](https://github.com/aurafhe-official) already exists. Anyone pastes `github:aurafhe-official/mcp`. npm alias later: `@aurafhe/mcp`.

```json
{
  "mcpServers": {
    "aura": {
      "command": "npx",
      "args": ["-y", "github:aurafhe-official/mcp"]
    }
  }
}
```

```bash
bash scripts/launch.sh
```

---

## 0 · Surfaces

| Surface | Value |
|---|---|
| GitHub | `https://github.com/aurafhe-official` (user, live) |
| Repo | `https://github.com/aurafhe-official/mcp` (live) |
| npm | `@aurafhe/mcp` |
| Backend | `https://api.afhe.io:8443` (live) |
| Hosted MCP | `https://mcp.afhe.io/mcp` (optional) |
| Logo | `docs/assets/aura.png` |
| Social preview | `docs/assets/social.png` |

Repo About (Settings, as aurafhe-official): description `MCP server for private compute. One paste into Cursor, Claude, or any host.` · website `https://afhe.io` · social preview upload `docs/assets/social.png` · topics `mcp, mcp-server, ai, agents, fhe`. Profile photo: `docs/assets/aura-512.png`.

This Cloud Agent cannot create the GitHub repo or publish npm from the `aurafhe-official` account. You can. One browser step, then push.

---

## 1 · Create repo `mcp` (browser, ~30s)

Signed in as **aurafhe-official**:

1. Open [github.com/new](https://github.com/new)
2. Owner: **aurafhe-official**
3. Name: **mcp**
4. Public
5. Do **not** add README, gitignore, or license
6. Create repository

You should then see `https://github.com/aurafhe-official/mcp` (empty).

Or rename the existing fork: `aurafhe-official/aura-sdk` → Settings → Rename → `mcp`.

---

## 2 · Push this checkout

```bash
git remote add official https://github.com/aurafhe-official/mcp.git
git push -u official HEAD:main
```

Same as `bash scripts/sync-mcp.sh`.

Add Actions secret `NPM_TOKEN` on that repo (publish `@aurafhe/mcp`).

Grant the **Cursor GitHub App** on `aurafhe-official` if you want this agent to push next time.

---

## 3 · npm `@aurafhe` and first publish

1. Sign in at [npmjs.com](https://www.npmjs.com) with `gen@afhe.io`.
2. Create org `aurafhe` if needed: [Create organization](https://www.npmjs.com/org/create).
3. On your laptop:

```bash
npm login
npm test
npm publish --access public
```

Or Actions → Publish npm.

```bash
npm view @aurafhe/mcp version
npx -y @aurafhe/mcp
```

---

## 4 · TLS on `api.afhe.io`

Genesis answers `/health`, but the Let's Encrypt cert expired **28 Aug 2026**. Renew on the host:

```bash
sudo certbot certonly --nginx -d api.afhe.io
sudo systemctl reload nginx
bash scripts/check-network.sh
```

This MCP still connects (genesis TLS is trusted). Renew anyway.

---

## 5 · Optional hosted URL `https://mcp.afhe.io/mcp`

DNS: `mcp` A/CNAME → the VM.

```bash
git clone https://github.com/aurafhe-official/mcp.git
cd mcp
npm ci && npm run build
docker compose -f deploy/compose.yml up -d --build
curl -sS https://mcp.afhe.io/healthz
```

```json
{
  "mcpServers": {
    "aura": { "url": "https://mcp.afhe.io/mcp" }
  }
}
```

---

## 6 · Order

1. Empty repo `aurafhe-official/mcp`
2. `bash scripts/sync-mcp.sh`
3. `npm publish --access public`
4. Renew `api.afhe.io` cert
5. Optional `mcp.afhe.io`
