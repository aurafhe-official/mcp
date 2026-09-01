# Connect test

Small MCP client against [github.com/aurafhe-official/mcp](https://github.com/aurafhe-official/mcp). Not an SDK — it only speaks MCP.

Paste [`mcp.json`](./mcp.json) into Cursor (`.cursor/mcp.json`), then:

```bash
npm run connect          # local dist → genesis
npm run connect:github   # npx github:aurafhe-official/mcp → genesis
```

Expect `private 25+17 42`.
