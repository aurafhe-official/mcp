# Connect to Aura

Install Node.js 20+ and Git, available on your MCP host's PATH.

```sh
npx -y github:aurafhe-official/mcp#rebuild/owner-controlled-mcp --check
npx -y github:aurafhe-official/mcp#rebuild/owner-controlled-mcp --config cursor --demo
```

Replace `cursor` with `claude` or `vscode`. Copy the generated Aura entry into
your host settings, preserving other servers, and reconnect. The command prints
platform-appropriate settings without editing files or echoing credentials.

| Host | Settings |
| --- | --- |
| Cursor | Project `.cursor/mcp.json` or user `~/.cursor/mcp.json` |
| Claude Desktop | MCP JSON opened through the app's developer settings |
| VS Code | `.vscode/mcp.json`; generator uses its `servers` format |

Official references: [Cursor](https://prod.cursor.com/help/customization/mcp),
[Claude Desktop](https://modelcontextprotocol.io/docs/develop/connect-local-servers),
[VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## Fixed demo

Ask the agent to check status, list operations and input handles, add integer
inputs 0 and 1, and export the result. The public inputs by index are `25`, `17`,
`7.5`, `2.5`, `2`; the last three are floats. The service encrypts these fixed
examples outside tool arguments. No custom plaintext is accepted.

Exports are saved in `~/.aura-mcp/results/<resultId>.json`. The agent receives
only the ID. A recipient processes the encrypted file outside MCP using Aura's
separate owner integration. The synthetic verifier below checks expected answers;
MCP itself does not decrypt or display them.

Without `--demo`, the server connects and lists tools without configuration.
Status and operation discovery contact Aura when requested. Input handles require
an operator-provisioned encrypted bundle.

## Operator configuration

Configure paths and credentials outside chat. This preview permits synthetic
integration only while its confidentiality release gate remains blocked.

| Variable | Default / purpose |
| --- | --- |
| `AURA_COPROCESSOR_URL` | `https://api.afhe.io:8443`; HTTPS origin only |
| `AURA_ACCESS_TOKEN` | Optional for public demo; required for bundle mode |
| `AURA_INPUT_BUNDLE` | Absolute path to version 1 encrypted input JSON |
| `AURA_RESULT_DIR` | Absolute export directory; default `~/.aura-mcp/results` |

Bundle mode checks that the authenticated worker reports `role: "compute"`,
`secretKeyLoaded: false` and a matching `keyId` before computation. The public
demo endpoint does not satisfy that contract. Use an isolated compute-only worker
for bundle integration. Server metadata is a routing safeguard, not cryptographic
proof or tenant authorization. The owner SDK and engine remain private components.

`--demo` cannot be combined with an input bundle. Keep owner plaintext, keys and
credentials inaccessible to the agent's other tools. Protect files with OS access
controls; POSIX file modes do not configure Windows ACLs.

## Troubleshooting

- Install fails: check Node and Git on the host's PATH, then restart the host.
- Connection check fails: repair network, credentials or certificate. TLS
  verification cannot be disabled through an Aura setting.
- Inputs unavailable: enable the fixed demo or provision an encrypted bundle.
- `COMPUTE_ONLY_KEY_SCOPE_REQUIRED`: repair worker role, key state or key ID;
  do not bypass the check.
- `OPERATION_UNAVAILABLE`: consult `fhe_ops`.
- Handles expire: reconnect and reimport inputs after 30 minutes. Exported files
  have a separate recipient retention policy.
- Legacy settings fail: follow [Migration](MIGRATION.md).

Do not paste the coprocessor URL into a remote-MCP field. This service exposes an
API, not a hosted MCP/OAuth connection.

## Developer verification

```sh
git clone --branch rebuild/owner-controlled-mcp https://github.com/aurafhe-official/mcp.git
cd mcp
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:package
npm run test:live
```

The last command explicitly checks fixed synthetic data through live MCP,
including decryption outside MCP. It never changes service keys or reads owner
input files. Errors fail the check instead of becoming skipped tests.

The preview is not published on npm. PR and main can differ until merge. For a
repeatable installation replace the branch after `#` in host settings with a
reviewed full commit SHA; the generator's branch reference is for preview use.
