# Architecture

```text
MCP host (Cursor, Claude, VS Code, …)
  ↓  MCP tools   npx -y github:aurafhe-official/mcp
AURA MCP server
  ↓  HTTPS + JSON
Private-compute network
```

This package is an MCP server. Language SDKs in `clients/` are the same backend for apps that are not MCP hosts. Default network: `https://api.afhe.io:8443`. Story: [STORY.md](STORY.md).

## What the agent sees

Tools, not key files:

- `fhe_status` / `fhe_ops`
- `fhe_private_eval` — one-shot private compute
- `fhe_encrypt` / `fhe_compute` / `fhe_decrypt` — multi-step graphs with `ct_…` handles

Handles live in the MCP process. Ciphertext does not have to round-trip through the prompt.

## What the backend sees

The HTTP contract in [PROTOCOL.md](PROTOCOL.md): health, encrypt, decrypt, generic `call`. This MCP maps agent op names (`add`, `mean`, `concat`) onto that contract.

## Why MCP

Hosts already speak tools. This server is one more tool. Apps that are not MCP hosts use TypeScript / Python / Go / CLI. The backend can change as long as the HTTP contract holds.
