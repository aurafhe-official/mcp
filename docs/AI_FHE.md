# AURA MCP

An MCP server. Agents use tools. The model never sees the data.

```text
Agent  --MCP-->  npx github:aurafhe-official/mcp  --HTTPS-->  api.afhe.io:8443
```

1. `fhe_status` — is this MCP online?
2. `fhe_private_eval` — seal, run, reveal only the answer
3. Keep intermediates as `ct_…` handles

Live ops: arithmetic, compare, strings, scientific. Retrieval, SQL, and inference are roadmap.

Story: [STORY.md](STORY.md).
