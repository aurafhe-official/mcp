# Add AURA as an MCP server

Paste this. Anyone can add it — no npm account, no local server.

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
claude mcp add aura -- npx -y github:aurafhe-official/mcp
```

Claude Desktop: copy `claude-desktop.json` into `claude_desktop_config.json`.  
VS Code: `vscode.json` (`type: stdio`).

After npm publish you can swap the arg to `@aurafhe/mcp`.

[docs/STORY.md](../../docs/STORY.md) · [docs/LAUNCH.md](../../docs/LAUNCH.md)
