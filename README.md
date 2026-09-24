# AURA MCP

**FHE is the base layer. MCP makes encrypted computation accessible to AI agents.**

[中文说明](README.zh-CN.md) · [Investor walkthrough](docs/INVESTOR-DEMO.md)

Connect Cursor, Claude Desktop, VS Code and other compatible MCP clients to
Aura's coprocessor. Build numeric workflows with encrypted inputs, compose
calculations and export encrypted results. Computation runs on Aura's service;
the MCP tools work with handles instead of exposing raw values to the agent.

## Read this first

**What this project demonstrates.** The public demo connects an agent to remote
ciphertext computation using fixed public examples. Install only Node.js and
the MCP locally; the computation engine runs on Aura's service. A separate
synthetic verifier measures correctness, error and request latency.

**What production looks like.** For confidentiality against the compute provider,
the owner generates keys and encrypts in its own environment, the server computes
on ciphertext, and an authorized recipient decrypts locally. This release provides
a demo and an operator-bundle integration path, not a verified client-key workflow.
The demonstration backend manages demo keys and can decrypt its demo data.

**What is open today.** The MCP adapter, adapter tests and synthetic live verifier
are public. Client cryptography, the coprocessor implementation and a cryptographic
proof suite are not distributed here. Further open-source scope and dates will
be announced separately by Aura.

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

> Run aura_start. Show the mode and available operations, get the fixed demo
> inputs, add integer inputs 0 and 1, and export the encrypted result.

`aura_start` explains the workflow and checks the service. It does not silently
claim that a decrypted answer or key custody was verified.

For a quick terminal connection check:

```sh
aura-fhe-mcp --check
```

The `preview` tag installs the current synthetic-data preview. To install this
exact release, use `@aurafhe/mcp@0.5.0-rc.5` instead.

## Available today: encrypted numeric computation

- Integer and float addition, subtraction, multiplication and division.
- Composed sums, products, float averages and weighted sums through the coprocessor.
- Guided onboarding, roadmap and evidence status alongside the six computation tools.
- Encrypted result files for separate recipient processing.
- Per-computation client latency and ciphertext size; timing includes network and
  service checks, not just engine execution.

Numeric arithmetic is a core use case for fully homomorphic encryption (FHE).
Binary-operation support expands the available operations; it is not what makes
numeric computation homomorphic. The synthetic live verifier reports expected and
actual results, absolute error and tolerance. [Verification details](docs/VERIFICATION.md).

The fixed demo uses public sample numbers. MCP does not accept custom plaintext,
secret keys or arbitrary file paths. The public package contains only the
connection adapter; the computation implementation stays on the service.

## Next release: binary operations

Binary-operation support is planned for the next release, expanding the
computations available through the same MCP connection. The release will document
the supported operations and their verification results when they become available.

## Beyond the primitives

FHE provides the foundation for application workflows such as encrypted databases,
model inference and custom business computations. Each needs its own integration
and validation beyond this arithmetic interface. Contact **gen@afhe.io** to discuss
application demonstrations, technical due diligence or custom use cases.
`aura_roadmap` distinguishes available primitives, compositions and planned work.

## Modes and evidence

| | Fixed demo | Operator bundle | Verified client/server workflow |
| --- | --- | --- | --- |
| Availability | `--demo` | Operator configuration | Not shipped in this release |
| Inputs | Five public examples | Externally prepared ciphertext file | Intended owner-local encryption |
| Computation | Demo backend | Authenticated worker with matching key declaration | Intended compute-only deployment |
| Decryption | External verifier uses demo backend | Separate recipient integration | Intended recipient-local decryption |
| Confidentiality claim | None | Not established by metadata | Requires evidence before release |

Successful tool responses and handled operation errors identify their mode and
carry `confidentialityClaimed: false`. Protocol validation errors may occur before
a tool runs. `aura_proof` reports evidence status, not a cryptographic proof or
certification. No mode is labeled Verified, and no unperformed check is marked pass.

## Using the public preview

**Public demo:** Use synthetic data. Confidential deployments require verified
key isolation and access controls. [Deployment security](docs/SECURITY-MODEL.md).

[Setup](docs/QUICKSTART.md) · [Tools](docs/PROTOCOL.md) ·
[Verification](docs/VERIFICATION.md) · [Security](SECURITY.md)
