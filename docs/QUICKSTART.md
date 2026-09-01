# Quickstart

```bash
npx -y github:aurafhe-official/mcp
```

Or paste the `mcpServers` block from the [README](../README.md) into Cursor / Claude / VS Code. Snippets: [`examples/mcp`](../examples/mcp/).

Ask the agent:

> Use AURA to privately add 25 and 17.

It should call `fhe_private_eval` and return `42`.

Default network: `https://api.afhe.io:8443`. Override with `AFHE_API_URL` only for a local node.

Story: [STORY.md](STORY.md).
