# Connect Aura MCP

## 1. Install

Install Node.js 20+ and Git, then run:

```sh
npm install -g --install-links "github:aurafhe-official/mcp#main"
```

This installs the current MCP preview. No npm account or local computation
engine is needed. The registry package is not yet published.

## 2. Connect your app

```sh
aura-fhe-mcp --config cursor --demo
```

Replace `cursor` with `claude` or `vscode`. Copy the generated Aura entry into
your host's settings, preserve existing servers, and reconnect.

| Host | Settings |
| --- | --- |
| Cursor | Project `.cursor/mcp.json` or user `~/.cursor/mcp.json` |
| Claude Desktop | Developer settings → Edit Config |
| VS Code | `.vscode/mcp.json` |

The generator prints configuration; it does not edit your files. It uses the
absolute paths to your installed Node and MCP, so the host does not download
packages at startup. Generate settings on the machine that runs the MCP. After
moving the installation or changing Node's location, regenerate the settings.

Official references: [Cursor](https://prod.cursor.com/help/customization/mcp),
[Claude Desktop](https://modelcontextprotocol.io/docs/develop/connect-local-servers),
[VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## 3. Try it

Ask the agent to check Aura, list its demo inputs, add integer inputs 0 and 1,
then export the encrypted result. The fixed public inputs are `25`, `17`, `7.5`,
`2.5` and `2`; the last three are floats.

The agent receives a result ID. Its encrypted file is saved in
`~/.aura-mcp/results/<resultId>.json`. Separate recipient processing reads the
result; MCP does not decrypt or display the answer.

For a terminal check, run `aura-fhe-mcp --check`. Running `aura-fhe-mcp` alone
starts a server that waits for MCP requests; that wait is expected.

## Application configuration

Without `--demo`, the MCP can discover tools and check the service. Computing
custom encrypted inputs requires an operator-provisioned [input bundle](PROTOCOL.md),
matching authenticated compute-only worker and separate recipient processing.
The present release is limited to synthetic integration while confidentiality
review remains blocked. Do not supply confidential customer data.

| Environment variable | Purpose |
| --- | --- |
| `AURA_COPROCESSOR_URL` | HTTPS origin; default `https://api.afhe.io:8443` |
| `AURA_ACCESS_TOKEN` | Optional for demo; required for bundle mode |
| `AURA_INPUT_BUNDLE` | Absolute path to encrypted input JSON |
| `AURA_RESULT_DIR` | Absolute export directory; default `~/.aura-mcp/results` |

Set these in protected host configuration outside chat. Bundle computation
requires `/health` to declare `role: "compute"`, `secretKeyLoaded: false` and
a matching `keyId`. The public demo endpoint does not meet that contract.
Metadata alone does not prove key isolation. Demo and bundle mode cannot be combined.
Protect input/output directories with OS permissions, including Windows ACLs.

## Troubleshooting

- Command missing: confirm Node/npm and the npm global bin directory are on PATH;
  restart your terminal after installing them.
- Host cannot start MCP: regenerate settings after moving Node or the installation.
- Connection error: check network, service certificate and credentials. Keep TLS verification enabled.
- Inputs unavailable: use `--demo` or provision the encrypted bundle.
- `COMPUTE_ONLY_KEY_SCOPE_REQUIRED`: the service's role, key state or key ID is incompatible.
- `OPERATION_UNAVAILABLE`: use `fhe_ops` to see available operations.
- Handles expire after 30 minutes: reconnect to load fresh inputs. Exported files persist.
- `LEGACY_CONFIGURATION_UNSUPPORTED`: remove old `AFHE_*`, native-library and draft key settings; use only the variables above.

The coprocessor API URL is not a hosted MCP/OAuth address. Configure a local
command-based MCP server using the generated settings.
