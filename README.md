# AURA MCP

**FHE is the base layer. MCP makes encrypted computation accessible to AI agents.**

[中文说明](README.zh-CN.md) · [Investor walkthrough](docs/INVESTOR-DEMO.md)

**New to FHE? Start here.** Fully homomorphic encryption (FHE) lets us calculate
with data in its encrypted form. Connect your assistant, then say:

> Show me the Aura demo. I am new to FHE; explain each step as we go.

Your assistant introduces a simple example, prepares encrypted samples, requests
the calculation from Aura and saves the encrypted result. It explains what each
step means. No key setup, private data or knowledge of tool names is needed.

The first example combines two public shop totals, 25 and 17. Their expected sum
is 42. The tour returns an **encrypted result**, not a decrypted or verified 42.
Connect Cursor, Claude Desktop, VS Code or another compatible MCP client below.

## Read this first

**What this project demonstrates.** The public demo connects an agent to remote
ciphertext computation using fixed public examples. Install only Node.js and
the MCP locally; the computation engine runs on Aura's service. A separate
synthetic verifier measures correctness, error and request latency.

**What production looks like.** For confidentiality against the compute provider,
the owner generates keys and encrypts in its own environment, the server computes
on ciphertext, and an authorized recipient decrypts locally. This release provides
a demo and an operator-bundle integration path, not a verified client-key workflow.
Demo mode is **backend-keyed**: the demonstration backend manages demo keys and
can decrypt its demo data.

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

> Show me the Aura demo. I am new to FHE; explain each step as we go.

The assistant guides you through four steps:

1. **Understand:** what encrypted computing means and which public examples we use.
2. **Prepare:** obtain encrypted versions of the example numbers.
3. **Calculate:** ask Aura to combine them and receive an encrypted result.
4. **Save and explain:** save the result, recap what happened, and choose what to try next.

In apps that show MCP prompts, you can also select **Show me encrypted computing**
(`aura_demo`). Connecting makes the tools available; your message starts the tour.
The host controls tool approvals and how the guidance is displayed.
Ask questions at any point, or say “one step at a time.” No copying long identifiers
or loading keys is needed. The assistant uses the tools for you.

For a quick terminal connection check:

```sh
aura-fhe-mcp --check
```

The `preview` tag installs the current synthetic-data preview. To install this
exact release, use `@aurafhe/mcp@0.5.0-rc.6` instead.

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

Aura confirms its **FHE database** and **FHE-AI LLM inference** applications are
**completed, available on request via gen@afhe.io**. These applications are not
exposed through the demo MCP; arrange a separate demonstration with Aura.
FHE provides their computation foundation. Custom business workflows require
their own integration and validation beyond this arithmetic interface.
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
