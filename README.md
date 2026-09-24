# AURA MCP

Connect an MCP-compatible agent to Aura's coprocessor. Computation stays in the
remote service; this repository contains the connection adapter, not the engine.

**Diagnostic preview: synthetic data only. The confidentiality release gate is
still blocked. Working arithmetic and valid HTTPS do not establish that Aura
cannot recover inputs.**

## Connect

Install Node.js 20+ and Git. This candidate is on the PR branch, not npm.

```sh
npx -y github:aurafhe-official/mcp#rebuild/owner-controlled-mcp --check
npx -y github:aurafhe-official/mcp#rebuild/owner-controlled-mcp --config cursor --demo
```

Replace `cursor` with `claude` or `vscode`. Copy the generated JSON into your
host's MCP settings and reconnect. The generator handles Windows and contains no
credentials. It prints settings without editing existing configuration.
[Host locations and troubleshooting](docs/QUICKSTART.md).

Then ask your agent:

> Check Aura, list its demo input handles, add integer inputs 0 and 1, and export
> the encrypted result.

The demo uses only fixed public examples. It sends arithmetic to the live
coprocessor and gives the agent an encrypted result reference. Decryption is a
separate recipient action. Omit `--demo` for a connection that checks status and
operations until the operator provisions encrypted inputs.

## What works

Six tools: `fhe_status`, `fhe_ops`, `fhe_inputs`, `fhe_compute`, `fhe_export`,
`fhe_release`. Addition, subtraction, multiplication and division work on integer
and float ciphertexts when advertised by the connected service. Sum and product
can combine multiple handles. An average is a sum followed by division by an
owner-supplied encrypted count. [Formats and limits](docs/PROTOCOL.md).

MCP accepts no source values, key files, arbitrary paths or engine function names.
Export writes an encrypted file to the configured recipient directory and returns
only its ID. No native library, cryptographic implementation, engine parameter set
or owner SDK is included in this package.

The hosted demo also supports backend decryption. Operator-provisioned bundles
require an authenticated compute-only worker with the matching key ID. That
check does not prove cryptographic confidentiality. The existing engine release
gate remains in force. [Privacy boundary](docs/SECURITY-MODEL.md) ·
[Release status](release-status.json).

This is a local stdio MCP adapter connecting over HTTPS. The coprocessor API is
not a hosted MCP URL. Shared inbound HTTP is not provided.

[Setup](docs/QUICKSTART.md) · [Verification](docs/VERIFICATION.md) ·
[Migration](docs/MIGRATION.md) · [Security](SECURITY.md)
