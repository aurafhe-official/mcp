# AURA MCP

**Encrypted numeric computation for AI agents, through one MCP connection.**

Connect Cursor, Claude Desktop, VS Code and other compatible MCP clients to
Aura's coprocessor. Build numeric workflows with encrypted inputs, compose
calculations and export encrypted results. Computation runs on Aura's service;
the MCP tools work with handles instead of exposing raw values to the agent.

## Install and connect

**Choose your app:**

[![Cursor](https://img.shields.io/badge/Cursor-Connect-111827?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#cursor)
[![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-Connect-D97757?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#claude-desktop)
[![VS Code](https://img.shields.io/badge/VS_Code-Connect-007ACC?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#vs-code)
[![Other MCP clients](https://img.shields.io/badge/Other_MCP_clients-Setup-475569?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#other-mcp-clients)

Each button opens setup instructions for that app.

Requires Node.js 20+. No Git or npm account is needed.

```sh
npm install -g @aurafhe/mcp@preview
aura-fhe-mcp --config cursor --demo
```

Replace `cursor` with `claude` or `vscode`. Copy the generated Aura entry into
your app's MCP settings, preserve any existing servers, and reconnect.
The app starts the installed MCP automatically. No npm account is required.
[Where to paste the settings](docs/QUICKSTART.md).

Then ask your agent:

> Check Aura, list its demo inputs, add integer inputs 0 and 1, and export the
> encrypted result.

For a quick terminal connection check:

```sh
aura-fhe-mcp --check
```

The `preview` tag installs the current synthetic-data preview. To install this
exact release, use `@aurafhe/mcp@0.5.0-rc.4` instead.

## Available today: encrypted numeric computation

- Integer and float addition, subtraction, multiplication and division.
- Composed sums, products and averages through the coprocessor.
- Six MCP tools for status, operations, inputs, computation, export and release.
- Encrypted result files for separate recipient processing.

Numeric arithmetic is a core use case for fully homomorphic encryption (FHE).
Binary-operation support expands the available operations; it is not what makes
numeric computation homomorphic. This MCP release's numeric workflows have passed
10 live end-to-end checks through Aura's coprocessor. [Verification details](docs/VERIFICATION.md).

The fixed demo uses public sample numbers. MCP does not accept custom plaintext,
secret keys or arbitrary file paths. The public package contains only the
connection adapter; the computation implementation stays on the service.

## Next release: binary operations

Binary-operation support is planned for the next release, expanding the
computations available through the same MCP connection. The release will document
the supported operations and their verification results when they become available.

## Using the public preview

The public demo is for synthetic data and includes service-side decryption of its
demo data. Custom encrypted inputs require a provisioned authenticated compute-only
service. Owner-only confidentiality has not yet been verified, so this preview is
not approved for confidential production data. Functional computation checks and
production security assurance are separate; see the [security model](docs/SECURITY-MODEL.md).

[Setup](docs/QUICKSTART.md) · [Tools](docs/PROTOCOL.md) ·
[Verification](docs/VERIFICATION.md) · [Security](SECURITY.md)
