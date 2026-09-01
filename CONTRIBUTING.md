# Contributing

Thanks for helping make private AI compute easier. Canonical repo: [github.com/aurafhe-official/mcp](https://github.com/aurafhe-official/mcp). Story: [docs/STORY.md](docs/STORY.md).

## Reporting bugs

Please open an issue with:
- MCP host (Cursor / Claude / VS Code) or client (TS / Go / Python / CLI)
- Server build (commit or release tag)
- Minimal reproduction
- What you expected vs what you got

## Development

MCP server (this is the product):

```bash
npm install
npm test
npm run inspector
```

Language SDKs live under `clients/` and share the HTTP protocol in `docs/PROTOCOL.md`:

```bash
# TypeScript
cd clients/typescript && npm install && npm test

# Go
cd clients/go && go test -v ./...

# Python
cd clients/python && pip install -e . && pytest

# CLI
cd clients/cli && npm install && npm test
```

When you add a coprocessor operation, add the AI-facing name in `src/fhe.ts` and wrap it in every language client.

## Pull requests

- One topic per PR.
- Update `README.md` if the one-line MCP install or tool list changes.
- Add a test that fails before your change and passes after.

## Security

Please do **not** open public issues for security reports. See `SECURITY.md`.
