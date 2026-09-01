# The AURA story

AI is moving from assistants to agents to transactions to organisations to machines. Agents do work through **tools**. MCP is how those tools are wired.

Today's stack protects data at rest and in transit — then decrypts it the moment a model (or a tool behind the model) works on it. That compute-time gap is the product.

## What this MCP server does

AURA is an MCP server. Add it once. Every host that speaks MCP (Cursor, Claude, VS Code, …) gets private-compute **tools**.

1. **Encrypt at the owner** — data is sealed before it leaves
2. **Compute on ciphertext** — the network runs the job without seeing plaintext
3. **Decrypt only at the recipient** — the agent reveals only the answer you asked for

**MCP is the distribution. FHE is the engine.** Existing agents migrate in. No rebuild.

```text
Cursor · Claude · VS Code · any MCP host
        ↓  MCP (tools)
github:aurafhe-official/mcp     ← this repository
        ↓  HTTPS
AURA network   https://api.afhe.io:8443
```

Paste `npx -y github:aurafhe-official/mcp`. Language SDKs in `clients/` are the same backend for apps that are not MCP hosts.

## What ships today

MCP tools: `fhe_status`, `fhe_ops`, `fhe_private_eval`, plus encrypt / compute / decrypt with `ct_…` handles.

Backend ops: encrypt / decrypt, integer and float arithmetic, compare, bitwise, strings, scientific. Ciphertext never has to enter the prompt.

## What is roadmap

Encrypted retrieval, private SQL, and private inference are on the AURA deck. They are **not** live MCP tools yet.

## Who

Mochi Labs Pte. Ltd. · [gen@afhe.io](mailto:gen@afhe.io) · [afhe.io](https://afhe.io) · [docs.afhe.io](https://docs.afhe.io)

Canonical home: [github.com/aurafhe-official/mcp](https://github.com/aurafhe-official/mcp)
