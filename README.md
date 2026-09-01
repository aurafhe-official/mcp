<p align="center">
  <img src="./docs/assets/aura.png" alt="AURA" width="220">
</p>

<p align="center">
  <b>MCP server for private compute</b><br>
  Add it to Cursor, Claude, or any host. The model never sees the data.
</p>

<p align="center">
  <a href="https://github.com/aurafhe-official/mcp"><img src="https://img.shields.io/badge/MCP-server-F5A623?style=flat-square&labelColor=111" alt="MCP"></a>
  <a href="https://api.afhe.io:8443/health"><img src="https://img.shields.io/badge/genesis-live-2ea44f?style=flat-square&labelColor=111" alt="genesis live"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F5A623?style=flat-square&labelColor=111" alt="MIT"></a>
  <a href="https://afhe.io"><img src="https://img.shields.io/badge/afhe.io-black?style=flat-square&labelColor=111" alt="afhe.io"></a>
</p>

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
npx -y github:aurafhe-official/mcp
claude mcp add aura -- npx -y github:aurafhe-official/mcp
npm run connect:github
```

That is the whole product. Then ask the agent:

> Privately add 25 and 17.

It should call `fhe_private_eval` and return `42`. No keys in chat. No localhost.

Install is GitHub npx. `@aurafhe/mcp` is not on npm yet.

---

<details>
<summary><b>Cursor · Claude · VS Code</b></summary>

**Cursor** — `.cursor/mcp.json` or `~/.cursor/mcp.json`

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

**Claude Code**

```bash
claude mcp add aura -- npx -y github:aurafhe-official/mcp
```

**Claude Desktop** — paste [`examples/mcp/claude-desktop.json`](examples/mcp/claude-desktop.json) into `claude_desktop_config.json`.

**VS Code Copilot** — `.vscode/mcp.json`

```json
{
  "servers": {
    "aura": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:aurafhe-official/mcp"]
    }
  }
}
```

**HTTP** (one URL for a team)

```bash
npx -y github:aurafhe-official/mcp --http --port 8787
```

</details>

<details>
<summary><b>Tools the agent gets</b></summary>

| Tool | What the agent uses it for |
|---|---|
| `fhe_status` | Is this MCP online? |
| `fhe_ops` | Which private ops can I call? |
| `fhe_private_eval` | **Main tool.** Seal → run → optional reveal |
| `fhe_encrypt` / `fhe_compute` / `fhe_decrypt` | Multi-step graphs with `ct_…` handles |

Live ops: add, mean, compare, concat, scientific. Retrieval, SQL, and inference are roadmap.

```json
{
  "name": "fhe_private_eval",
  "arguments": {
    "domain": "int",
    "op": "mean",
    "values": [81, 94, 73],
    "reveal": true
  }
}
```

</details>

<details>
<summary><b>Why MCP</b></summary>

Agents already speak **tools**. AURA is one more MCP server: the host seals inputs, the network computes, the agent only receives handles (`ct_…`) or the final answer.

1. Encrypt at the owner
2. Compute on ciphertext
3. Decrypt only at the recipient

Existing agents migrate in. No rebuild. Story: [docs/STORY.md](docs/STORY.md).

Zero-config talks to genesis: [`https://api.afhe.io:8443`](https://api.afhe.io:8443/health)

| Variable | Default | Purpose |
|---|---|---|
| `AFHE_API_URL` | `https://api.afhe.io:8443` | Backend |
| `AFHE_API_KEY` | — | Bearer token if required |
| `AFHE_TIMEOUT_MS` | `120000` | Per-request timeout |
| `AFHE_INSECURE_TLS` | genesis + localhost | Set `0` to require a valid certificate |

</details>

<p align="center">
  MIT · Mochi Labs · <a href="mailto:gen@afhe.io">gen@afhe.io</a> · <a href="https://github.com/aurafhe-official/mcp">github.com/aurafhe-official/mcp</a>
</p>
