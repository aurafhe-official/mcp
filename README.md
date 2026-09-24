# AURA MCP

Connect your AI agent to Aura's coprocessor for encrypted arithmetic.
Computation runs remotely; your agent receives handles and encrypted result IDs.

## Install and connect

Requires Node.js 20+ and Git for this GitHub installation.

```sh
npm install -g "github:aurafhe-official/mcp#rebuild/owner-controlled-mcp"
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

The reviewed preview currently installs from the GitHub branch above. The npm
registry package is not yet published. This page will switch to the registry
install command after publication and a fresh installation check.

## What works

- Integer and float addition, subtraction, multiplication and division.
- Composed sums, products and averages through the coprocessor.
- Six MCP tools for status, operations, inputs, computation, export and release.
- Encrypted result files for separate recipient processing.

The fixed demo uses public sample numbers. MCP does not accept custom plaintext,
secret keys or arbitrary file paths. The public package contains only the
connection adapter; the computation implementation stays on the service.

**Synthetic-data preview. The public demo service can decrypt its demo data;
owner-only confidentiality is not verified and production use remains blocked.**
Custom encrypted inputs require a provisioned authenticated compute-only service.
This release provides numeric arithmetic, not arbitrary FHE applications.

[Setup](docs/QUICKSTART.md) · [Tools](docs/PROTOCOL.md) ·
[Verification](docs/VERIFICATION.md) · [Security](SECURITY.md)
