# Connect Aura MCP

Install on the same computer that runs your assistant. You need
[Node.js 20+](https://nodejs.org/en/download); the current LTS is a suitable choice.
On Windows, open PowerShell. On macOS or Linux, open Terminal.
No Git, npm account or local computation engine is required.

Choose [Cursor](#cursor), [Claude Desktop](#claude-desktop), [VS Code](#vs-code)
or [another local MCP client](#other-mcp-clients). Each section includes installation.

## Cursor

Run in your terminal:

```sh
npm install -g @aurafhe/mcp@preview
aura-fhe-mcp --config cursor --demo
```

Open your project folder in Cursor. Create or open `.cursor/mcp.json` inside it.
For a new file, paste the **entire generated JSON** and save. If it already has
servers, copy only the generated `aura` entry into the existing `mcpServers`
object; preserve the other entries. A user-wide file is also supported at
`~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`).

Reconnect or restart Cursor, enable Aura's tools, then use the first message below.

## Claude Desktop

Run in your terminal:

```sh
npm install -g @aurafhe/mcp@preview
aura-fhe-mcp --config claude --demo
```

Open **Settings → Developer → Edit Config**. For an empty configuration, paste
the entire generated JSON. If `mcpServers` already exists, add only its generated
`aura` entry and preserve the others. Save and fully quit/reopen Claude Desktop.
This is the desktop app's local MCP connection, not a web connector URL.

## VS Code

Run in your terminal:

```sh
npm install -g @aurafhe/mcp@preview
aura-fhe-mcp --config vscode --demo
```

In your project, create or open `.vscode/mcp.json`. For a new file, paste the entire
generated JSON. Otherwise add only the `aura` entry under its existing `servers`
object. Save, start Aura from VS Code's MCP controls, review the trust prompt and
enable its tools for your agent. User-wide configuration is available through
the command palette's **MCP: Open User Configuration** command.

## Other MCP clients

Use a client that supports local stdio MCP servers. Run:

```sh
npm install -g @aurafhe/mcp@preview
aura-fhe-mcp --config claude --demo
```

Copy the generated `command` and `args` from `mcpServers.aura` into your client's
local server settings. Its outer configuration format may differ; follow that
client's instructions. Clients that accept only hosted HTTPS/OAuth URLs cannot
use this local connection directly. Neither the coprocessor API nor Aura Chat
is a hosted MCP URL.

## Your first message

> What can I do with Aura? Show me the AI application first, then explain what I can run here.

The assistant introduces Aura AI and the attributed website benchmark, then offers
the [application walkthrough](AI-DEMO.md), an optional learning lesson, or the
current tool reference. It does not automatically start arithmetic or claim to
run the separate AI model. This overview also works when the compute service is
unreachable; `fhe_status` separately checks the connection.

If the app lists MCP prompts, choose **What can I do with Aura?** (`aura_demo`).
Connecting makes nine tools available; sending your message starts the experience.
The host controls approvals and presentation.

## Optional: learn with public encrypted samples

> Teach me encrypted computation using Aura's public sample lesson.

The assistant uses `aura_start` with `experience: "learn"`, introduces public shop
totals 25 and 17, prepares their encrypted forms, requests addition and saves an
encrypted result. Their expected sum is 42; the MCP does not decrypt or verify it.
The [separate synthetic verifier](VERIFICATION.md) checks actual numerical results.
Other public samples, 7.5, 2.5 and 2, support an average. The `aura_learn` prompt
starts the same lesson. No private data, key loading or copied identifiers are needed.

Results are saved in `~/.aura-mcp/results/<resultId>.json`; separate recipient
processing reads them. This lesson uses Aura-managed demo keys and public data.

## Installation and update details

The generator prints settings; it does not edit configuration files. It uses
absolute paths to the installed Node and MCP. Generate settings on the machine
running the client. **Do not paste `/exec-daemon/node` or `/workspace/...` paths
from someone else's cloud session into a local installation.**

Current release: `0.5.0-rc.7` preview. Pin it with `@aurafhe/mcp@0.5.0-rc.7`.
To update, repeat installation, regenerate settings, then fully restart the host.
After moving Node or the package, regenerate settings too.
For a terminal service check use `aura-fhe-mcp --check`; running the bare command
starts a server that waits for MCP requests, which is expected.

Official references: [Cursor](https://prod.cursor.com/help/customization/mcp),
[Claude Desktop](https://modelcontextprotocol.io/docs/develop/connect-local-servers),
[VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## Operator integration

Without `--demo`, the connection can show the overview, discover tools and check
the service. Custom encrypted inputs need an operator-provisioned [bundle](PROTOCOL.md),
matching authenticated compute-only worker and separate recipient integration.
Neither mode establishes confidential production readiness.

| Environment variable | Purpose |
| --- | --- |
| `AURA_COPROCESSOR_URL` | HTTPS origin; default `https://api.afhe.io:8443` |
| `AURA_ACCESS_TOKEN` | Optional for demo; required for bundle mode |
| `AURA_INPUT_BUNDLE` | Absolute path to encrypted input JSON |
| `AURA_RESULT_DIR` | Absolute export directory; default `~/.aura-mcp/results` |

Keep credentials outside chat. Bundle computation requires the worker to declare
`role: "compute"`, `secretKeyLoaded: false` and a matching `keyId`; those declarations
alone do not prove isolation. Demo and bundle cannot be combined. Protect files
with operating-system permissions. [Security details](SECURITY-MODEL.md).

## Troubleshooting

- Command missing: finish installing Node, reopen the terminal and check npm's global command path.
- Host cannot start Aura: regenerate settings locally and fully restart the app.
- Still seeing the old tour: reinstall the package and reconnect the host process.
- No welcome message: send the first message above; connecting does not start chat.
- Service error: check the connection, certificate and credentials; keep HTTPS verification enabled.
- Aura Chat certificate error: use the contact in the [AI walkthrough](AI-DEMO.md); do not bypass the warning.
- Inputs unavailable: regenerate your configuration with `--demo` for public examples.
- Agent displays identifiers: ask it to explain the returned guide in plain language.
- `COMPUTE_ONLY_KEY_SCOPE_REQUIRED`: operator bundle and worker key scope do not match.
- `OPERATION_UNAVAILABLE`: choose an operation advertised by `fhe_ops`.
- References expire after 30 minutes: reconnect for fresh public samples; saved files persist.
- `LEGACY_CONFIGURATION_UNSUPPORTED`: remove old `AFHE_*`, native-library and draft key settings.
