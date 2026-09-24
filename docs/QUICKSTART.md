# Connect Aura MCP

## 1. Install

Install Node.js 20+, then run:

```sh
npm install -g @aurafhe/mcp@preview
```

This installs the current MCP preview. No Git, npm account or local computation
engine is needed. Use `@aurafhe/mcp@0.5.0-rc.6` to pin this exact release.

## 2. Connect your app

[Cursor](#cursor) · [Claude Desktop](#claude-desktop) · [VS Code](#vs-code) ·
[Other MCP clients](#other-mcp-clients)

Install the package in step 1, then follow your app's instructions below.

### Cursor

```sh
aura-fhe-mcp --config cursor --demo
```

Add the generated `aura` entry under `mcpServers` in your project's
`.cursor/mcp.json` or your user `~/.cursor/mcp.json`. Preserve existing entries,
then reconnect or restart Cursor. Confirm that Aura's nine tools appear.

### Claude Desktop

```sh
aura-fhe-mcp --config claude --demo
```

Open Claude Desktop's **Settings → Developer → Edit Config**. Add the generated
`aura` entry under `mcpServers`, preserving existing entries. Save and fully
restart Claude Desktop. Confirm that Aura's nine tools appear.

This is for the desktop app's local MCP connection, not a web connector URL.

### VS Code

```sh
aura-fhe-mcp --config vscode --demo
```

Add the generated `aura` entry under `servers` in `.vscode/mcp.json`, preserving
existing entries. Start Aura from VS Code's MCP controls, review any trust prompt,
and enable its tools for your agent.

### Other MCP clients

Use a client that supports local **stdio MCP** servers. Generate the connection:

```sh
aura-fhe-mcp --config claude --demo
```

Copy the `command` and `args` values from `mcpServers.aura` into your client's
local MCP configuration. Clients may use a different outer configuration format;
follow their documentation. Keep each argument as a separate array entry.

Clients that accept only a hosted HTTPS/OAuth MCP URL cannot use this local
connection directly. Aura's coprocessor API address is not an MCP server URL.

### How the generated settings work

The generator prints configuration; it does not edit your files. It uses the
absolute paths to your installed Node and MCP, so the host does not download
packages at startup. Generate settings on the machine that runs the MCP. After
moving the installation or changing Node's location, regenerate the settings.

Official references: [Cursor](https://prod.cursor.com/help/customization/mcp),
[Claude Desktop](https://modelcontextprotocol.io/docs/develop/connect-local-servers),
[VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## 3. Say hello — no FHE knowledge needed

Send this message to your assistant:

> Show me the Aura demo. I am new to FHE; explain each step as we go.

The assistant explains FHE as calculating with encrypted data. It prepares two
public example shop totals (25 and 17), asks Aura to add their encrypted forms,
and saves the encrypted result. You do not need to load keys, choose technical
tools or copy identifiers. Ask questions at any point, or say “one step at a time.”

If your app exposes MCP prompts, **Show me encrypted computing** (`aura_demo`)
starts the same tour. The connection itself does not automatically send a message
or run a calculation. Your host controls tool approvals and presentation.

The expected sum is 42; this tour does not decrypt or verify the answer. The
assistant explains that distinction in its recap. Its encrypted file is saved in
`~/.aura-mcp/results/<resultId>.json`. Separate recipient processing reads the
result; MCP does not decrypt or display the answer. The other public examples
(7.5, 2.5 and 2) can be used for a follow-up average. No private values are needed.

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
- No welcome message: send “Show me the Aura demo”; connecting alone does not start a chat.
- Agent shows identifiers or tool JSON: ask it to explain the returned guide in plain language.
- `COMPUTE_ONLY_KEY_SCOPE_REQUIRED`: the service's role, key state or key ID is incompatible.
- `OPERATION_UNAVAILABLE`: use `fhe_ops` to see available operations.
- Handles expire after 30 minutes: reconnect to load fresh inputs. Exported files persist.
- `LEGACY_CONFIGURATION_UNSUPPORTED`: remove old `AFHE_*`, native-library and draft key settings; use only the variables above.

The coprocessor API URL is not a hosted MCP/OAuth address. Configure a local
command-based MCP server using the generated settings.
